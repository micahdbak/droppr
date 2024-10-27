CREATE EXTENSION IF NOT EXISTS "pgcrypto";

----------------------------------------------------------------

CREATE TABLE drops (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    code         char(6)      NOT NULL,
    date_started date         NOT NULL DEFAULT NOW(),
    is_complete  boolean      NOT NULL DEFAULT 'f',
    file_name    varchar(255) NOT NULL,
    file_size    bigint       NOT NULL,
    file_type    varchar(100) NOT NULL
);
-- To get the drop ID given a drop code:
--   SELECT id FROM drops WHERE code = $1 AND is_complete = 'f';
-- Which will return at most 1 row always because of the index unique_code_for_incomplete_drops_idx.

CREATE UNIQUE INDEX unique_code_for_incomplete_drops_idx ON drops(code) WHERE is_complete = 'f';

----------------------------------------------------------------

CREATE TYPE drop_role_enum AS ENUM ('dropper', 'receiver');

CREATE TABLE sessions (
    drop_id   UUID           NOT NULL REFERENCES drops(id),
    drop_role drop_role_enum NOT NULL,

    PRIMARY KEY (drop_id, drop_role)
);