-- Deux applis : Sprichts A2 et Sprichts B1 (identifiant Android séparé).
-- Le numéro de build n'est plus unique pour tout le site, mais par appli :
-- SQLite ne sait pas retirer une contrainte UNIQUE, la table est donc recopiée.
-- Toutes les versions existantes sont des versions A2.
CREATE TABLE versions_apps (
    id            TEXT    PRIMARY KEY,
    app           TEXT    NOT NULL DEFAULT 'a2' CHECK (app IN ('a2', 'b1')),
    version_name  TEXT    NOT NULL,
    version_code  INTEGER NOT NULL,
    notes         TEXT    NOT NULL DEFAULT '',
    url           TEXT    NOT NULL,
    size          INTEGER,
    created_at    INTEGER NOT NULL,
    downloads     INTEGER NOT NULL DEFAULT 0,
    UNIQUE (app, version_code)
);

INSERT INTO versions_apps (id, app, version_name, version_code, notes, url, size, created_at, downloads)
    SELECT id, 'a2', version_name, version_code, notes, url, size, created_at, downloads FROM versions;

DROP TABLE versions;
ALTER TABLE versions_apps RENAME TO versions;
