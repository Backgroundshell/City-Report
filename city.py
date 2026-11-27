"""Local demo correspondence between administrators and municipal services."""

DEPARTMENTS = {
    "roads": "Zespół dróg i chodników",
    "lighting": "Oświetlenie miejskie",
    "cleaning": "Służby porządkowe",
    "greenery": "Zespół utrzymania zieleni",
}
STATUSES = {"open": "Otwarta", "in_progress": "W realizacji", "resolved": "Zakończona"}
REPORT_STATUSES = {"open": "Nowe", "in_progress": "W toku", "resolved": "Rozwiązane"}


class CityError(ValueError):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def valid_id(value):
    if type(value) is not int or not 1 <= value <= 2**63 - 1:
        raise CityError("Wybierz poprawny numer zgłoszenia lub sprawy.")
    return value


def text(data, name, label, limit):
    value = data.get(name)
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > limit:
        raise CityError(f"{label}: wpisz od 1 do {limit} znaków.")
    return value.strip()


def choice(data, name, options, label):
    value = data.get(name)
    if not isinstance(value, str) or value not in options:
        raise CityError(f"Wybierz poprawną wartość pola: {label}.")
    return value


def audit(connection, kind, entity, entity_id, details, timestamp):
    connection.execute(
        "INSERT INTO audit_log(event_type,entity,entity_id,details,created_at) VALUES(?,?,?,?,?)",
        (kind, entity, entity_id, details, timestamp),
    )


def case_query():
    return """SELECT cc.*, r.title AS report_title, r.address, r.status AS report_status,r.priority AS report_priority,
        r.description AS report_description, cat.name AS category_name,
        (SELECT COUNT(*) FROM city_messages m WHERE m.case_id=cc.id) AS message_count,
        (SELECT m.body FROM city_messages m WHERE m.case_id=cc.id ORDER BY m.id DESC LIMIT 1) AS last_message
        FROM city_cases cc JOIN reports r ON r.id=cc.report_id
        LEFT JOIN categories cat ON cat.id=r.category_id"""


def list_cases(connection):
    cases = [dict(row) for row in connection.execute(case_query() + " ORDER BY cc.updated_at DESC, cc.id DESC")]
    return {"cases": cases, "departments": DEPARTMENTS, "statuses": STATUSES, "demo": True}


def get_case(connection, case_id):
    valid_id(case_id)
    row = connection.execute(case_query() + " WHERE cc.id=?", (case_id,)).fetchone()
    if row is None:
        raise CityError("Nie znaleziono sprawy miejskiej.", 404)
    result = dict(row)
    result["messages"] = [dict(message) for message in connection.execute(
        """SELECT m.id,m.direction,m.body,m.department,m.created_at,u.name AS author_name
            FROM city_messages m JOIN users u ON u.id=m.author_id
            WHERE m.case_id=? ORDER BY m.id""", (case_id,),
    )]
    return result


def create_case(connection, user, data, timestamp):
    report_id = valid_id(data.get("report_id"))
    department = choice(data, "department", DEPARTMENTS, "służba miejska")
    subject = text(data, "subject", "Temat sprawy", 160)
    body = text(data, "body", "Wiadomość", 4000)
    report = connection.execute("SELECT status FROM reports WHERE id=?", (report_id,)).fetchone()
    if report is None:
        raise CityError("Nie znaleziono zgłoszenia.", 404)
    existing = connection.execute("SELECT id FROM city_cases WHERE report_id=?", (report_id,)).fetchone()
    if existing:
        raise CityError(f"To zgłoszenie ma już sprawę miejską #{existing['id']}.", 409)
    status = next((key for key, value in REPORT_STATUSES.items() if value == report["status"]), "open")
    cursor = connection.execute(
        """INSERT INTO city_cases(report_id,department,subject,status,created_by,created_at,updated_at)
            VALUES(?,?,?,?,?,?,?)""",
        (report_id, department, subject, status, user["id"], timestamp, timestamp),
    )
    case_id = cursor.lastrowid
    connection.execute(
        "INSERT INTO city_messages(case_id,author_id,department,direction,body,created_at) VALUES(?,?,?,?,?,?)",
        (case_id, user["id"], department, "outgoing", body, timestamp),
    )
    audit(connection, "CREATE", "city_case", case_id,
          f"Utworzono sprawę demo #{case_id} dla zgłoszenia #{report_id}: {DEPARTMENTS[department]}", timestamp)
    return get_case(connection, case_id)


def add_message(connection, case_id, user, data, timestamp):
    current = get_case(connection, case_id)
    direction = choice(data, "direction", ("outgoing", "incoming"), "rodzaj wiadomości")
    body = text(data, "body", "Wiadomość", 4000)
    cursor = connection.execute(
        "INSERT INTO city_messages(case_id,author_id,department,direction,body,created_at) VALUES(?,?,?,?,?,?)",
        (case_id, user["id"], current["department"], direction, body, timestamp),
    )
    connection.execute("UPDATE city_cases SET updated_at=? WHERE id=?", (timestamp, case_id))
    label = "odpowiedź służb (demo)" if direction == "incoming" else "wiadomość do służb (demo)"
    audit(connection, "CREATE", "city_message", cursor.lastrowid,
          f"Sprawa #{case_id}: zapisano {label}", timestamp)
    return get_case(connection, case_id)


def update_case(connection, case_id, data, timestamp):
    current = get_case(connection, case_id)
    department = choice(data, "department", DEPARTMENTS, "służba miejska")
    status = choice(data, "status", STATUSES, "etap naprawy")
    connection.execute("UPDATE city_cases SET department=?,status=?,updated_at=? WHERE id=?",
                       (department, status, timestamp, case_id))
    report_status = REPORT_STATUSES[status]
    if current["report_status"] != report_status:
        connection.execute("UPDATE reports SET status=?,updated_at=? WHERE id=?",
                           (report_status, timestamp, current["report_id"]))
        audit(connection, "UPDATE", "report", current["report_id"],
              f"Sprawa miejska #{case_id}: zmieniono status zgłoszenia na „{report_status}”", timestamp)
    audit(connection, "UPDATE", "city_case", case_id,
          f"Zaktualizowano sprawę demo #{case_id}: {DEPARTMENTS[department]}, {STATUSES[status]}", timestamp)
    return get_case(connection, case_id)


def sync_report_status(connection, report_id, report_status, timestamp):
    status = next((key for key, value in REPORT_STATUSES.items() if value == report_status), None)
    if status is None:
        return
    current = connection.execute("SELECT id,status FROM city_cases WHERE report_id=?", (report_id,)).fetchone()
    if current and current["status"] != status:
        connection.execute("UPDATE city_cases SET status=?,updated_at=? WHERE id=?", (status, timestamp, current["id"]))
        audit(connection, "UPDATE", "city_case", current["id"],
              f"Zsynchronizowano etap sprawy demo ze zgłoszeniem #{report_id}: {STATUSES[status]}", timestamp)
