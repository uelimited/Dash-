from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta
from pathlib import Path
import os
from typing import Literal
from uuid import uuid4

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import JSON, Date, DateTime, Float, ForeignKey, Integer, String, Text, URL, create_engine, func, inspect, select, text
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
UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
MAX_PDF_BYTES = 20 * 1024 * 1024


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
    priority: Mapped[str] = mapped_column(String(20), default="Class-C", server_default="Class-C")
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
    service: Mapped[str] = mapped_column(String(100), default="Other")
    scope: Mapped[str] = mapped_column(String(180), default="")
    quantity: Mapped[float] = mapped_column(Float, default=1)
    unit: Mapped[str] = mapped_column(String(30), default="units")
    amount: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(30), default="Requested")
    procurement_stage: Mapped[str] = mapped_column(String(24), default="RFQ", server_default="RFQ")
    order_date: Mapped[date] = mapped_column(Date, default=date.today)
    expected_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    gfc_spec_availability: Mapped[str] = mapped_column(String(20), default="Not set")
    gfc_spec_remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    gfc_drawing_availability: Mapped[str] = mapped_column(String(20), default="Not set")
    gfc_drawing_remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    control_confirmation_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    drawings_plan: Mapped[date | None] = mapped_column(Date, nullable=True)
    drawings_actual: Mapped[date | None] = mapped_column(Date, nullable=True)
    tds_submission_plan: Mapped[date | None] = mapped_column(Date, nullable=True)
    tds_submission_actual: Mapped[date | None] = mapped_column(Date, nullable=True)
    tds_approval_plan: Mapped[date | None] = mapped_column(Date, nullable=True)
    tds_approval_actual: Mapped[date | None] = mapped_column(Date, nullable=True)
    tds_status: Mapped[str] = mapped_column(String(1), default="D")
    po_planned_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    mfc_plan: Mapped[date | None] = mapped_column(Date, nullable=True)
    mfc_actual: Mapped[date | None] = mapped_column(Date, nullable=True)
    fat_plan: Mapped[date | None] = mapped_column(Date, nullable=True)
    fat_actual: Mapped[date | None] = mapped_column(Date, nullable=True)
    delivery_plan: Mapped[date | None] = mapped_column(Date, nullable=True)
    delivery_actual: Mapped[date | None] = mapped_column(Date, nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    project: Mapped[Project | None] = relationship(back_populates="procurements")


class TDSRecord(Base):
    __tablename__ = "tds_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    vendor: Mapped[str] = mapped_column(String(180))
    service: Mapped[str] = mapped_column(String(100), default="Other")
    title: Mapped[str] = mapped_column(String(180), default="")
    tds_number: Mapped[str] = mapped_column(String(100), default="")
    workflow_number: Mapped[str] = mapped_column(String(100), default="")
    pan: Mapped[str] = mapped_column(String(20), default="—")
    section: Mapped[str] = mapped_column(String(30), default="194C")
    taxable_amount: Mapped[float] = mapped_column(Float, default=0)
    rate: Mapped[float] = mapped_column(Float, default=1)
    tds_amount: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(30), default="Pending")
    financial_year: Mapped[str] = mapped_column(String(20), default="2026–27")
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    planned_submission_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    final_status: Mapped[str] = mapped_column(String(1), default="D")
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    revision_history: Mapped[list | None] = mapped_column(JSON, nullable=True, default=list)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    project: Mapped[Project | None] = relationship(back_populates="tdss")


class Document(Base):
    __tablename__ = "documents"
    id: Mapped[int] = mapped_column(primary_key=True)
    record_type: Mapped[str] = mapped_column(String(20), index=True)
    record_id: Mapped[int] = mapped_column(Integer, index=True)
    filename: Mapped[str] = mapped_column(String(255))
    storage_name: Mapped[str] = mapped_column(String(80), unique=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    action: Mapped[str] = mapped_column(String(30))
    entity_type: Mapped[str] = mapped_column(String(30), index=True)
    entity_id: Mapped[int] = mapped_column(Integer)
    project_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    project_name: Mapped[str | None] = mapped_column(String(180), nullable=True)
    summary: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class ProjectIn(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    client: str = "Internal"
    location: str = "—"
    status: Literal["Planning", "In progress", "On hold", "Completed"] = "Planning"
    budget: float = Field(ge=0)
    progress: int = Field(default=0, ge=0, le=100)
    priority: Literal["Class-A", "Class-B", "Class-C", "Class-D"] = "Class-C"
    start_date: date = Field(default_factory=date.today)
    due_date: date | None = None


class ProcurementIn(BaseModel):
    item: str = Field(min_length=1, max_length=180)
    vendor: str = Field(min_length=1, max_length=180)
    category: str = "Materials"
    service: str = "Other"
    scope: str = ""
    quantity: float = Field(default=1, gt=0)
    unit: str = "units"
    amount: float = Field(ge=0)
    status: Literal["Requested", "Approved", "Ordered", "Delivered", "Cancelled"] = "Requested"
    procurement_stage: Literal["RFQ", "Compared", "Final Make", "PO", "Delivered"] = "RFQ"
    order_date: date = Field(default_factory=date.today)
    expected_date: date | None = None
    gfc_spec_availability: Literal["Yes", "No", "Partial", "Not set"] = "Not set"
    gfc_spec_remarks: str | None = None
    gfc_drawing_availability: Literal["Yes", "No", "Partial", "Not set"] = "Not set"
    gfc_drawing_remarks: str | None = None
    control_confirmation_date: date | None = None
    drawings_plan: date | None = None
    drawings_actual: date | None = None
    tds_submission_plan: date | None = None
    tds_submission_actual: date | None = None
    tds_approval_plan: date | None = None
    tds_approval_actual: date | None = None
    tds_status: Literal["A", "B", "C", "D"] = "D"
    po_planned_date: date | None = None
    mfc_plan: date | None = None
    mfc_actual: date | None = None
    fat_plan: date | None = None
    fat_actual: date | None = None
    delivery_plan: date | None = None
    delivery_actual: date | None = None
    remarks: str | None = None
    project_id: int | None = None


class TDSIn(BaseModel):
    vendor: str = Field(min_length=1, max_length=180)
    service: str = "Other"
    title: str = ""
    tds_number: str = ""
    workflow_number: str = ""
    pan: str = "—"
    section: str = "194C"
    taxable_amount: float = Field(ge=0)
    rate: float = Field(default=1, ge=0, le=100)
    status: Literal["Pending", "Filed", "Paid"] = "Pending"
    financial_year: str = "2026–27"
    due_date: date | None = None
    planned_submission_date: date | None = None
    final_status: Literal["A", "B", "C", "D"] = "D"
    remarks: str | None = None
    project_id: int | None = None


class RevisionIn(BaseModel):
    submitted_date: date | None = None
    reply_date: date | None = None
    status: Literal["A", "B", "C", "D"] = "D"
    remarks: str | None = None


class DocumentOut(BaseModel):
    id: int
    filename: str
    uploaded_at: datetime
    download_url: str


class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    action: str
    entity_type: str
    entity_id: int
    project_id: int | None
    project_name: str | None
    summary: str
    created_at: datetime


class ProjectOut(ProjectIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class ProcurementOut(ProcurementIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    project_name: str | None = None
    project_priority: str | None = None
    documents: list[DocumentOut] = []


class TDSOut(TDSIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tds_amount: float
    created_at: datetime
    project_name: str | None = None
    project_priority: str | None = None
    revision_history: list[dict] = []
    documents: list[DocumentOut] = []


def db_session():
    with SessionLocal() as session:
        yield session


def log_activity(db: Session, action: str, entity_type: str, entity_id: int, summary: str, project_id: int | None = None, project_name: str | None = None):
    db.add(ActivityLog(action=action, entity_type=entity_type, entity_id=entity_id, summary=summary[:500], project_id=project_id, project_name=project_name))


SCHEMA_UPGRADES = {
    "projects": {"priority": "VARCHAR(20) NOT NULL DEFAULT 'Class-C'"},
    "procurements": {
        "procurement_stage": "VARCHAR(24) NOT NULL DEFAULT 'RFQ'",
        "service": "VARCHAR(100) NOT NULL DEFAULT 'Other'", "scope": "VARCHAR(180) NOT NULL DEFAULT ''",
        "gfc_spec_availability": "VARCHAR(20) NOT NULL DEFAULT 'Not set'", "gfc_spec_remarks": "TEXT NULL",
        "gfc_drawing_availability": "VARCHAR(20) NOT NULL DEFAULT 'Not set'", "gfc_drawing_remarks": "TEXT NULL",
        "control_confirmation_date": "DATE NULL", "drawings_plan": "DATE NULL", "drawings_actual": "DATE NULL",
        "tds_submission_plan": "DATE NULL", "tds_submission_actual": "DATE NULL", "tds_approval_plan": "DATE NULL",
        "tds_approval_actual": "DATE NULL", "tds_status": "VARCHAR(1) NOT NULL DEFAULT 'D'",
        "po_planned_date": "DATE NULL", "mfc_plan": "DATE NULL", "mfc_actual": "DATE NULL",
        "fat_plan": "DATE NULL", "fat_actual": "DATE NULL", "delivery_plan": "DATE NULL",
        "delivery_actual": "DATE NULL", "remarks": "TEXT NULL",
    },
    "tds_records": {
        "service": "VARCHAR(100) NOT NULL DEFAULT 'Other'", "title": "VARCHAR(180) NOT NULL DEFAULT ''",
        "tds_number": "VARCHAR(100) NOT NULL DEFAULT ''", "workflow_number": "VARCHAR(100) NOT NULL DEFAULT ''",
        "planned_submission_date": "DATE NULL", "final_status": "VARCHAR(1) NOT NULL DEFAULT 'D'",
        "remarks": "TEXT NULL", "revision_history": "JSON NULL",
    },
}


def ensure_schema():
    Base.metadata.create_all(engine)
    inspector = inspect(engine)
    with engine.begin() as connection:
        added_procurement_stage = False
        for table, additions in SCHEMA_UPGRADES.items():
            existing = {column["name"] for column in inspector.get_columns(table)}
            for name, ddl_type in additions.items():
                if name not in existing:
                    connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl_type}"))
                    if table == "procurements" and name == "procurement_stage":
                        added_procurement_stage = True
        if added_procurement_stage:
            connection.execute(text("UPDATE procurements SET procurement_stage = CASE status WHEN 'Approved' THEN 'Compared' WHEN 'Ordered' THEN 'PO' WHEN 'Delivered' THEN 'Delivered' ELSE 'RFQ' END"))


def document_values(db: Session, record_type: str, record_id: int):
    rows = db.scalars(select(Document).where(Document.record_type == record_type, Document.record_id == record_id).order_by(Document.uploaded_at.desc())).all()
    return [DocumentOut(id=row.id, filename=row.filename, uploaded_at=row.uploaded_at, download_url=f"/documents/{row.id}/download") for row in rows]


def procurement_out(row: Procurement, db: Session):
    return ProcurementOut.model_validate({
        **{column.name: getattr(row, column.name) for column in Procurement.__table__.columns},
        "project_name": row.project.name if row.project else None,
        "project_priority": row.project.priority if row.project else None,
        "documents": document_values(db, "procurement", row.id),
    })


def tds_out(row: TDSRecord, db: Session):
    return TDSOut.model_validate({
        **{column.name: getattr(row, column.name) for column in TDSRecord.__table__.columns},
        "project_name": row.project.name if row.project else None,
        "project_priority": row.project.priority if row.project else None,
        "revision_history": row.revision_history or [],
        "documents": document_values(db, "tds", row.id),
    })


def remove_documents(db: Session, record_type: str, record_id: int):
    rows = db.scalars(select(Document).where(Document.record_type == record_type, Document.record_id == record_id)).all()
    for row in rows:
        path = UPLOAD_DIR / row.storage_name
        if path.exists():
            path.unlink()
        db.delete(row)


def seed(session: Session):
    if session.scalar(select(func.count()).select_from(Project)):
        return
    projects = [
        Project(name="Marina Heights", client="Marina Group", location="Mumbai, MH", status="In progress", budget=4850000, progress=68, priority="Class-A", start_date=date(2026, 1, 12), due_date=date(2026, 12, 18)),
        Project(name="Crescent Medical Centre", client="Crescent Health", location="Hyderabad, TS", status="In progress", budget=3200000, progress=42, priority="Class-B", start_date=date(2026, 3, 3), due_date=date(2027, 2, 10)),
        Project(name="West Bay District Cooling", client="West Bay Utilities", location="Pune, MH", status="Planning", budget=2100000, progress=16, priority="Class-C", start_date=date(2026, 7, 6), due_date=date(2027, 5, 22)),
        Project(name="Al Noor Residences", client="Al Noor Developments", location="Bengaluru, KA", status="On hold", budget=1675000, progress=79, priority="Class-D", start_date=date(2025, 11, 1), due_date=date(2026, 10, 26)),
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
    ensure_schema()
    with SessionLocal() as session:
        seed(session)
    yield


app = FastAPI(title="Unique Engineers Operations API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"], allow_methods=["*"], allow_headers=["*"], allow_credentials=True)


@app.get("/health")
def health():
    return {"status": "ok", "database": engine.dialect.name}


@app.get("/dashboard")
def dashboard(db: Session = Depends(db_session)):
    projects = db.scalars(select(Project).order_by(Project.created_at.desc())).all()
    procurement = db.scalars(select(Procurement).order_by(Procurement.created_at.desc())).all()
    tdss = db.scalars(select(TDSRecord).order_by(TDSRecord.created_at.desc())).all()
    activities = db.scalars(select(ActivityLog).order_by(ActivityLog.created_at.desc(), ActivityLog.id.desc()).limit(12)).all()
    return {
        "projects": [ProjectOut.model_validate(x) for x in projects],
        "procurements": [procurement_out(row, db) for row in procurement],
        "tds_records": [tds_out(row, db) for row in tdss],
        "activities": [ActivityOut.model_validate(row) for row in activities],
        "summary": {"project_count": len(projects), "active_projects": sum(p.status == "In progress" for p in projects), "total_budget": sum(p.budget for p in projects), "procurement_spend": sum(p.amount for p in procurement if p.status != "Cancelled"), "pending_tds": sum(t.tds_amount for t in tdss if t.status == "Pending"), "pending_tds_count": sum(t.status == "Pending" for t in tdss)},
    }


@app.get("/projects", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(db_session)):
    return db.scalars(select(Project).order_by(Project.created_at.desc())).all()


@app.post("/projects", response_model=ProjectOut, status_code=201)
def create_project(data: ProjectIn, db: Session = Depends(db_session)):
    project = Project(**data.model_dump())
    db.add(project); db.flush()
    log_activity(db, "Created", "Project", project.id, f"Created project: {project.name}", project.id, project.name)
    db.commit(); db.refresh(project)
    return project


@app.patch("/projects/{project_id}", response_model=ProjectOut)
def update_project(project_id: int, data: dict, db: Session = Depends(db_session)):
    project = db.get(Project, project_id)
    if not project: raise HTTPException(404, "Project not found")
    allowed = set(ProjectIn.model_fields)
    changed = []
    for key, value in data.items():
        if key in allowed and getattr(project, key) != value:
            setattr(project, key, value); changed.append(key.replace("_", " "))
    if changed:
        log_activity(db, "Updated", "Project", project.id, f"Updated project: {project.name} · {', '.join(changed)}", project.id, project.name)
    db.commit(); db.refresh(project)
    return project


@app.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(db_session)):
    project = db.get(Project, project_id)
    if not project: raise HTTPException(404, "Project not found")
    project_name = project.name
    removed_tds = len(project.tdss)
    removed_procurement = len(project.procurements)
    for row in project.procurements: remove_documents(db, "procurement", row.id)
    for row in project.tdss: remove_documents(db, "tds", row.id)
    db.delete(project)
    log_activity(db, "Deleted", "Project", project_id, f"Deleted project: {project_name} · {removed_tds} TDS and {removed_procurement} procurement items", project_id, project_name)
    db.commit()


@app.get("/procurements", response_model=list[ProcurementOut])
def list_procurements(db: Session = Depends(db_session)):
    rows = db.scalars(select(Procurement).order_by(Procurement.created_at.desc())).all()
    return [procurement_out(row, db) for row in rows]


@app.post("/procurements", response_model=ProcurementOut, status_code=201)
def create_procurement(data: ProcurementIn, db: Session = Depends(db_session)):
    values = data.model_dump()
    stage_status = {"RFQ": "Requested", "Compared": "Approved", "Final Make": "Approved", "PO": "Ordered", "Delivered": "Delivered"}
    values["status"] = stage_status[values["procurement_stage"]]
    project = db.get(Project, values["project_id"]) if values["project_id"] else None
    if values["project_id"] and not project: raise HTTPException(404, "Project not found")
    row = Procurement(**values); db.add(row); db.flush()
    log_activity(db, "Created", "Procurement", row.id, f"Added procurement: {row.item}", row.project_id, project.name if project else None)
    db.commit(); db.refresh(row)
    return procurement_out(row, db)


@app.patch("/procurements/{row_id}", response_model=ProcurementOut)
def update_procurement(row_id: int, data: dict, db: Session = Depends(db_session)):
    row = db.get(Procurement, row_id)
    if not row: raise HTTPException(404, "Procurement not found")
    changed = []
    for key, value in data.items():
        if key in ProcurementIn.model_fields and getattr(row, key) != value:
            setattr(row, key, value); changed.append(key.replace("_", " "))
    status_stage = {"Requested": "RFQ", "Approved": "Compared", "Ordered": "PO", "Delivered": "Delivered"}
    stage_status = {"RFQ": "Requested", "Compared": "Approved", "Final Make": "Approved", "PO": "Ordered", "Delivered": "Delivered"}
    if "procurement_stage" in data:
        row.status = stage_status[data["procurement_stage"]]
    elif "status" in data and data["status"] in status_stage:
        row.procurement_stage = status_stage[data["status"]]
    if changed:
        project = db.get(Project, row.project_id) if row.project_id else None
        log_activity(db, "Updated", "Procurement", row.id, f"Updated procurement: {row.item} · {', '.join(changed)}", row.project_id, project.name if project else None)
    db.commit(); db.refresh(row)
    return procurement_out(row, db)


@app.delete("/procurements/{row_id}", status_code=204)
def delete_procurement(row_id: int, db: Session = Depends(db_session)):
    row = db.get(Procurement, row_id)
    if not row: raise HTTPException(404, "Procurement not found")
    item = row.item
    project = db.get(Project, row.project_id) if row.project_id else None
    remove_documents(db, "procurement", row.id)
    db.delete(row)
    log_activity(db, "Deleted", "Procurement", row_id, f"Deleted procurement: {item}", project.id if project else None, project.name if project else None)
    db.commit()


@app.get("/tds", response_model=list[TDSOut])
def list_tds(db: Session = Depends(db_session)):
    rows = db.scalars(select(TDSRecord).order_by(TDSRecord.created_at.desc())).all()
    return [tds_out(row, db) for row in rows]


@app.post("/tds", response_model=TDSOut, status_code=201)
def create_tds(data: TDSIn, db: Session = Depends(db_session)):
    values = data.model_dump()
    project = db.get(Project, values["project_id"]) if values["project_id"] else None
    if values["project_id"] and not project: raise HTTPException(404, "Project not found")
    row = TDSRecord(**values, tds_amount=round(values["taxable_amount"] * values["rate"] / 100, 2))
    db.add(row); db.flush()
    log_activity(db, "Created", "TDS", row.id, f"Added TDS: {row.title or row.vendor}", row.project_id, project.name if project else None)
    db.commit(); db.refresh(row)
    return tds_out(row, db)


@app.patch("/tds/{row_id}", response_model=TDSOut)
def update_tds(row_id: int, data: dict, db: Session = Depends(db_session)):
    row = db.get(TDSRecord, row_id)
    if not row: raise HTTPException(404, "TDS record not found")
    changed = []
    for key, value in data.items():
        if key in TDSIn.model_fields and getattr(row, key) != value:
            setattr(row, key, value); changed.append(key.replace("_", " "))
    row.tds_amount = round(row.taxable_amount * row.rate / 100, 2)
    if changed:
        project = db.get(Project, row.project_id) if row.project_id else None
        log_activity(db, "Updated", "TDS", row.id, f"Updated TDS: {row.title or row.vendor} · {', '.join(changed)}", row.project_id, project.name if project else None)
    db.commit(); db.refresh(row)
    return tds_out(row, db)


@app.delete("/tds/{row_id}", status_code=204)
def delete_tds(row_id: int, db: Session = Depends(db_session)):
    row = db.get(TDSRecord, row_id)
    if not row: raise HTTPException(404, "TDS record not found")
    title = row.title or row.vendor
    project = db.get(Project, row.project_id) if row.project_id else None
    remove_documents(db, "tds", row.id)
    db.delete(row)
    log_activity(db, "Deleted", "TDS", row_id, f"Deleted TDS: {title}", project.id if project else None, project.name if project else None)
    db.commit()


@app.post("/tds/{row_id}/revisions", response_model=TDSOut, status_code=201)
def add_tds_revision(row_id: int, data: RevisionIn, db: Session = Depends(db_session)):
    row = db.get(TDSRecord, row_id)
    if not row: raise HTTPException(404, "TDS record not found")
    history = row.revision_history or []
    history.append({"revision": f"REV-{len(history)}", **data.model_dump(mode="json")})
    row.revision_history = history
    row.final_status = data.status
    project = db.get(Project, row.project_id) if row.project_id else None
    log_activity(db, "Updated", "TDS", row.id, f"Added {history[-1]['revision']} to TDS: {row.title or row.vendor}", row.project_id, project.name if project else None)
    db.commit(); db.refresh(row)
    return tds_out(row, db)


def stored_documents(record_type: str, record_id: int, db: Session):
    rows = db.scalars(select(Document).where(Document.record_type == record_type, Document.record_id == record_id).order_by(Document.uploaded_at.desc())).all()
    return [DocumentOut(id=row.id, filename=row.filename, uploaded_at=row.uploaded_at, download_url=f"/documents/{row.id}/download") for row in rows]


async def save_pdf(record_type: str, record_id: int, file: UploadFile, db: Session):
    model = TDSRecord if record_type == "tds" else Procurement
    record = db.get(model, record_id)
    if not record: raise HTTPException(404, f"{record_type.title()} record not found")
    content = await file.read(MAX_PDF_BYTES + 1)
    if len(content) > MAX_PDF_BYTES: raise HTTPException(413, "PDF exceeds the 20 MB limit")
    if not content.startswith(b"%PDF-"): raise HTTPException(400, "Upload a valid PDF file")
    original_name = Path(file.filename or "attachment.pdf").name
    filename = original_name if original_name.lower().endswith(".pdf") else f"{original_name}.pdf"
    storage_name = f"{uuid4().hex}.pdf"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    (UPLOAD_DIR / storage_name).write_bytes(content)
    row = Document(record_type=record_type, record_id=record_id, filename=filename[:255], storage_name=storage_name)
    try:
        db.add(row)
        project = db.get(Project, record.project_id) if record.project_id else None
        title = (record.title or record.vendor) if record_type == "tds" else record.item
        log_activity(db, "Uploaded PDF", "TDS" if record_type == "tds" else "Procurement", record_id, f"Uploaded {filename} to {title}", record.project_id, project.name if project else None)
        db.commit(); db.refresh(row)
    except Exception:
        (UPLOAD_DIR / storage_name).unlink(missing_ok=True)
        db.rollback()
        raise
    return DocumentOut(id=row.id, filename=row.filename, uploaded_at=row.uploaded_at, download_url=f"/documents/{row.id}/download")


@app.get("/tds/{row_id}/documents", response_model=list[DocumentOut])
def list_tds_documents(row_id: int, db: Session = Depends(db_session)):
    if not db.get(TDSRecord, row_id): raise HTTPException(404, "TDS record not found")
    return stored_documents("tds", row_id, db)


@app.post("/tds/{row_id}/documents", response_model=DocumentOut, status_code=201)
async def upload_tds_document(row_id: int, file: UploadFile = File(...), db: Session = Depends(db_session)):
    return await save_pdf("tds", row_id, file, db)


@app.get("/procurements/{row_id}/documents", response_model=list[DocumentOut])
def list_procurement_documents(row_id: int, db: Session = Depends(db_session)):
    if not db.get(Procurement, row_id): raise HTTPException(404, "Procurement record not found")
    return stored_documents("procurement", row_id, db)


@app.post("/procurements/{row_id}/documents", response_model=DocumentOut, status_code=201)
async def upload_procurement_document(row_id: int, file: UploadFile = File(...), db: Session = Depends(db_session)):
    return await save_pdf("procurement", row_id, file, db)


@app.get("/documents/{document_id}/download")
def download_document(document_id: int, db: Session = Depends(db_session)):
    row = db.get(Document, document_id)
    if not row: raise HTTPException(404, "Document not found")
    path = UPLOAD_DIR / row.storage_name
    if not path.is_file(): raise HTTPException(404, "Stored file not found")
    return FileResponse(path, media_type="application/pdf", filename=row.filename)
