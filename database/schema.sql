CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE drop_role_enum AS ENUM ('dropper', 'receiver');

CREATE TABLE sessions (
    token     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drop_id   char(6) NOT NULL,
    drop_role drop_role_enum NOT NULL
);