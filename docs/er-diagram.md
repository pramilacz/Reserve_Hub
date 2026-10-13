# Entity Relationship diagram

Renders on GitHub as-is. For the shareable link the assessment asks for, import
[`er-diagram.dbml`](./er-diagram.dbml) into <https://dbdiagram.io/d> and share that link.

```mermaid
erDiagram
    USERS ||--o{ RESERVATIONS : "makes"
    RESOURCES ||--o{ RESERVATIONS : "is reserved by"

    USERS {
        text id PK
        text name
        text email UK
        enum role "ADMIN | MEMBER"
        timestamptz createdAt
    }

    RESOURCES {
        text id PK
        text name UK
        enum type "ROOM | EQUIPMENT | VEHICLE | OTHER"
        text location
        int capacity
        text description
        boolean isActive
        timestamptz createdAt
        timestamptz updatedAt
    }

    RESERVATIONS {
        text id PK
        text resourceId FK
        text userId FK
        text title
        text notes
        timestamptz startTime
        timestamptz endTime
        enum status "CONFIRMED | CANCELLED"
        timestamptz cancelledAt
        timestamptz createdAt
        timestamptz updatedAt
    }
```

## Integrity rules enforced by the database

| Rule | Mechanism |
| --- | --- |
| End time is after start time | `CHECK ("endTime" > "startTime")` |
| No two confirmed reservations overlap on the same resource | `EXCLUDE USING gist ("resourceId" WITH =, tstzrange("startTime","endTime",'[)') WITH &&) WHERE ("status" = 'CONFIRMED')` |
| A resource or user with history cannot be deleted | `ON DELETE RESTRICT` on both foreign keys |
| Unique emails and resource names | unique indexes |
