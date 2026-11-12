from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta
from pathlib import Path
import os
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text, URL, create_engine, func, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = URL.create(
        "mysql+pymysql",
        username=os.getenv("DB_USER", "ue_app"),
        password=os.getenv("DB_PASSWORD", ""),
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", "3306")),
        database=os.getenv("DB_NAME", "unique_engineers"),
        query={"charset": "utf8mb4"},
    )
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(180))
    client: Mapped[str] = mapped_column(String(180), default="Internal")
    location: Mapped[str] = mapped_column(String(180), default="—")
    status: Mapped[str] = mapped_column(String(30), default="Planning")
    budget: Mapped[float] = mapped_column(Float, default=0)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    start_date: Mapped[date] = mapped_column(Date, default=date.today)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    procurements: Mapped[list["Procurement"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    tdss: Mapped[list["TDSRecord"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class Procurement(Base):
    __tablename__ = "procurements"
    id: Mapped[int] = mapped_column(primary_key=True)
    item: Mapped[str] = mapped_column(String(180))
    vendor: Mapped[str] = mapped_column(String(180))
    category: Mapped[str] = mapped_column(String(100), default="Materials")
    quantity: Mapped[float] = mapped_column(Float, default=1)
    unit: Mapped[str] = mapped_column(String(30), default="units")
    amount: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(30), default="Requested")
    order_date: Mapped[date] = mapped_column(Date, default=date.today)
    expected_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    project: Mapped[Project | None] = relationship(back_populates="procurements")


class TDSRecord(Base):
    __tablename__ = "tds_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    vendor: Mapped[str] = mapped_column(String(180))
    pan: Mapped[str] = mapped_column(String(20), default="—")
    section: Mapped[str] = mapped_column(String(30), default="194C")
    taxable_amount: Mapped[float] = mapped_column(Float, default=0)
    rate: Mapped[float] = mapped_column(Float, default=1)
    tds_amount: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(30), default="Pending")
    financial_year: Mapped[str] = mapped_column(String(20), default="2026–27")
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    project: Mapped[Project | None] = relationship(back_populates="tdss")


class ProjectIn(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    client: str = "Internal"
    location: str = "—"
    status: Literal["Planning", "In progress", "On hold", "Completed"] = "Planning"
    budget: float = Field(ge=0)
    progress: int = Field(default=0, ge=0, le=100)
    start_date: date = Field(default_factory=date.today)
    due_date: date | None = None


class ProcurementIn(BaseModel):
    item: str = Field(min_length=1, max_length=180)
    vendor: str = Field(min_length=1, max_length=180)
    category: str = "Materials"
    quantity: float = Field(default=1, gt=0)
    unit: str = "units"
    amount: float = Field(ge=0)
    status: Literal["Requested", "Approved", "Ordered", "Delivered", "Cancelled"] = "Requested"
    order_date: date = Field(default_factory=date.today)
    expected_date: date | None = None
    project_id: int | None = None


class TDSIn(BaseModel):
    vendor: str = Field(min_length=1, max_length=180)
    pan: str = "—"
    section: str = "194C"
    taxable_amount: float = Field(ge=0)
    rate: float = Field(default=1, ge=0, le=100)
    status: Literal["Pending", "Filed", "Paid"] = "Pending"
    financial_year: str = "2026–27"
    due_date: date | None = None
    project_id: int | None = None


class ProjectOut(ProjectIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class ProcurementOut(ProcurementIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    project_name: str | None = None


class TDSOut(TDSIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tds_amount: float
    created_at: datetime
    project_name: str | None = None


def db_session():
    with SessionLocal() as session:
        yield session


def seed(session: Session):
    if session.scalar(select(func.count()).select_from(Project)):
        return
    projects = [
        Project(name="Marina Heights", client="Marina Group", location="Mumbai, MH", status="In progress", budget=4850000, progress=68, start_date=date(2026, 1, 12), due_date=date(2026, 12, 18)),
        Project(name="Crescent Medical Centre", client="Crescent Health", location="Hyderabad, TS", status="In progress", budget=3200000, progress=42, start_date=date(2026, 3, 3), due_date=date(2027, 2, 10)),
        Project(name="West Bay District Cooling", client="West Bay Utilities", location="Pune, MH", status="Planning", budget=2100000, progress=16, start_date=date(2026, 7, 6), due_date=date(2027, 5, 22)),
        Project(name="Al Noor Residences", client="Al Noor Developments", location="Bengaluru, KA", status="On hold", budget=1675000, progress=79, start_date=date(2025, 11, 1), due_date=date(2026, 10, 26)),
    ]
    session.add_all(projects)
    session.flush()
    session.add_all([
        Procurement(item="Structural steel · Grade 500", vendor="Tata Steel Limited", category="Materials", quantity=24, unit="MT", amount=186400, status="Ordered", order_date=date(2026, 8, 20), expected_date=date.today() + timedelta(days=4), project_id=projects[0].id),
        Procurement(item="Ready-mix concrete · M30", vendor="ACC Concrete", category="Materials", quantity=52, unit="m³", amount=234000, status="Approved", order_date=date(2026, 8, 25), expected_date=date.today() + timedelta(days=9), project_id=projects[1].id),
        Procurement(item="Electrical switchgear panels", vendor="Schneider Electric", category="Electrical", quantity=8, unit="sets", amount=97600, status="Requested", order_date=date(2026, 9, 1), expected_date=date.today() + timedelta(days=15), project_id=projects[0].id),
        Procurement(item="Waterproof membrane · 4mm", vendor="Dr. Fixit", category="Materials", quantity=30, unit="rolls", amount=42800, status="Delivered", order_date=date(2026, 8, 8), expected_date=date(2026, 8, 28), project_id=projects[2].id),
        Procurement(item="Site safety equipment", vendor="Karam Safety", category="Safety", quantity=40, unit="sets", amount=32400, status="Delivered", order_date=date(2026, 8, 5), expected_date=date(2026, 8, 20), project_id=projects[1].id),
    ])
    session.add_all([
        TDSRecord(vendor="Aarav Civil Contractors", pan="AAKCA4829R", section="194C", taxable_amount=186400, rate=1, tds_amount=1864, status="Pending", financial_year="2026–27", due_date=date.today() + timedelta(days=12), project_id=projects[0].id),
        TDSRecord(vendor="Mitra Design Studio", pan="ABCPM2186K", section="194J", taxable_amount=95000, rate=10, tds_amount=9500, status="Filed", financial_year="2026–27", due_date=date.today() + timedelta(days=18), project_id=projects[1].id),
        TDSRecord(vendor="Kumar Earthworks", pan="AAGPK6103L", section="194C", taxable_amount=74300, rate=1, tds_amount=743, status="Pending", financial_year="2026–27", due_date=date.today() + timedelta(days=7), project_id=projects[2].id),
        TDSRecord(vendor="Vertex Engineering Pvt Ltd", pan="AAACV7912B", section="194J", taxable_amount=128000, rate=10, tds_amount=12800, status="Paid", financial_year="2026–27", due_date=date.today() - timedelta(days=4), project_id=projects[0].id),
        TDSRecord(vendor="Priya Logistics", pan="AALPP3381D", section="194C", taxable_amount=32500, rate=1, tds_amount=325, status="Filed", financial_year="2026–27", due_date=date.today() + timedelta(days=15), project_id=projects[3].id),
    ])
    session.commit()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    with SessionLocal() as session:
        seed(session)
    yield


app = FastAPI(title="Northstar Operations API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"], allow_methods=["*"], allow_headers=["*"], allow_credentials=True)


@app.get("/health")
def health():
    return {"status": "ok", "database": "sqlite"}


@app.get("/dashboard")
def dashboard(db: Session = Depends(db_session)):
    projects = db.scalars(select(Project).order_by(Project.created_at.desc())).all()
    procurement = db.scalars(select(Procurement).order_by(Procurement.created_at.desc())).all()
    tdss = db.scalars(select(TDSRecord).order_by(TDSRecord.created_at.desc())).all()
    return {
        "projects": [ProjectOut.model_validate(x) for x in projects],
        "procurements": [ProcurementOut.model_validate({**{c.name: getattr(x, c.name) for c in Procurement.__table__.columns}, "project_name": x.project.name if x.project else None}) for x in procurement],
        "tds_records": [TDSOut.model_validate({**{c.name: getattr(x, c.name) for c in TDSRecord.__table__.columns}, "project_name": x.project.name if x.project else None}) for x in tdss],
        "summary": {"project_count": len(projects), "active_projects": sum(p.status == "In progress" for p in projects), "total_budget": sum(p.budget for p in projects), "procurement_spend": sum(p.amount for p in procurement if p.status != "Cancelled"), "pending_tds": sum(t.tds_amount for t in tdss if t.status == "Pending"), "pending_tds_count": sum(t.status == "Pending" for t in tdss)},
    }


@app.get("/projects", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(db_session)):
    return db.scalars(select(Project).order_by(Project.created_at.desc())).all()


@app.post("/projects", response_model=ProjectOut, status_code=201)
def create_project(data: ProjectIn, db: Session = Depends(db_session)):
    project = Project(**data.model_dump())
    db.add(project); db.commit(); db.refresh(project)
    return project


@app.patch("/projects/{project_id}", response_model=ProjectOut)
def update_project(project_id: int, data: dict, db: Session = Depends(db_session)):
    project = db.get(Project, project_id)
    if not project: raise HTTPException(404, "Project not found")
    allowed = set(ProjectIn.model_fields)
    for key, value in data.items():
        if key in allowed: setattr(project, key, value)
    db.commit(); db.refresh(project)
    return project


@app.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(db_session)):
    project = db.get(Project, project_id)
    if not project: raise HTTPException(404, "Project not found")
    db.delete(project); db.commit()


@app.get("/procurements", response_model=list[ProcurementOut])
def list_procurements(db: Session = Depends(db_session)):
    rows = db.scalars(select(Procurement).order_by(Procurement.created_at.desc())).all()
    return [ProcurementOut.model_validate({**{c.name: getattr(x, c.name) for c in Procurement.__table__.columns}, "project_name": x.project.name if x.project else None}) for x in rows]


@app.post("/procurements", response_model=ProcurementOut, status_code=201)
def create_procurement(data: ProcurementIn, db: Session = Depends(db_session)):
    values = data.model_dump()
    if values["project_id"] and not db.get(Project, values["project_id"]): raise HTTPException(404, "Project not found")
    row = Procurement(**values); db.add(row); db.commit(); db.refresh(row)
    return ProcurementOut.model_validate({**{c.name: getattr(row, c.name) for c in Procurement.__table__.columns}, "project_name": row.project.name if row.project else None})


@app.patch("/procurements/{row_id}", response_model=ProcurementOut)
def update_procurement(row_id: int, data: dict, db: Session = Depends(db_session)):
    row = db.get(Procurement, row_id)
    if not row: raise HTTPException(404, "Procurement not found")
    for key, value in data.items():
        if key in ProcurementIn.model_fields: setattr(row, key, value)
    db.commit(); db.refresh(row)
    return ProcurementOut.model_validate({**{c.name: getattr(row, c.name) for c in Procurement.__table__.columns}, "project_name": row.project.name if row.project else None})


@app.delete("/procurements/{row_id}", status_code=204)
def delete_procurement(row_id: int, db: Session = Depends(db_session)):
    row = db.get(Procurement, row_id)
    if not row: raise HTTPException(404, "Procurement not found")
    db.delete(row); db.commit()


@app.get("/tds", response_model=list[TDSOut])
def list_tds(db: Session = Depends(db_session)):
    rows = db.scalars(select(TDSRecord).order_by(TDSRecord.created_at.desc())).all()
    return [TDSOut.model_validate({**{c.name: getattr(x, c.name) for c in TDSRecord.__table__.columns}, "project_name": x.project.name if x.project else None}) for x in rows]


@app.post("/tds", response_model=TDSOut, status_code=201)
def create_tds(data: TDSIn, db: Session = Depends(db_session)):
    values = data.model_dump()
    if values["project_id"] and not db.get(Project, values["project_id"]): raise HTTPException(404, "Project not found")
    row = TDSRecord(**values, tds_amount=round(values["taxable_amount"] * values["rate"] / 100, 2))
    db.add(row); db.commit(); db.refresh(row)
    return TDSOut.model_validate({**{c.name: getattr(row, c.name) for c in TDSRecord.__table__.columns}, "project_name": row.project.name if row.project else None})


@app.patch("/tds/{row_id}", response_model=TDSOut)
def update_tds(row_id: int, data: dict, db: Session = Depends(db_session)):
    row = db.get(TDSRecord, row_id)
    if not row: raise HTTPException(404, "TDS record not found")
    for key, value in data.items():
        if key in TDSIn.model_fields: setattr(row, key, value)
    row.tds_amount = round(row.taxable_amount * row.rate / 100, 2)
    db.commit(); db.refresh(row)
    return TDSOut.model_validate({**{c.name: getattr(row, c.name) for c in TDSRecord.__table__.columns}, "project_name": row.project.name if row.project else None})


@app.delete("/tds/{row_id}", status_code=204)
def delete_tds(row_id: int, db: Session = Depends(db_session)):
    row = db.get(TDSRecord, row_id)
    if not row: raise HTTPException(404, "TDS record not found")
    db.delete(row); db.commit()
