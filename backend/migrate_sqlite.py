"""Copy the local SQLite records into a configured, empty MySQL database."""

from pathlib import Path

from sqlalchemy import create_engine, func, select

from backend.main import Base, DATABASE_URL

HERE = Path(__file__).resolve().parent
SQLITE_PATH = HERE / "operations.db"


def migrate() -> None:
    if not SQLITE_PATH.exists():
        raise SystemExit(f"SQLite source not found: {SQLITE_PATH}")

    source = create_engine(f"sqlite:///{SQLITE_PATH.as_posix()}")
    target = create_engine(DATABASE_URL, pool_pre_ping=True)
    tables = Base.metadata.sorted_tables

    try:
        Base.metadata.create_all(target)
        with source.connect() as source_conn, target.begin() as target_conn:
            for table in tables:
                count = target_conn.scalar(select(func.count()).select_from(table))
                if count:
                    raise SystemExit(
                        f"Migration stopped: MySQL table '{table.name}' already contains "
                        f"{count} rows. The target database must be empty."
                    )

            total = 0
            for table in tables:
                rows = source_conn.execute(select(table)).mappings().all()
                if rows:
                    target_conn.execute(table.insert(), [dict(row) for row in rows])
                total += len(rows)
                print(f"{table.name}: copied {len(rows)} rows")

        print(f"Migration complete: copied {total} rows to MySQL.")
    finally:
        source.dispose()
        target.dispose()


if __name__ == "__main__":
    migrate()
