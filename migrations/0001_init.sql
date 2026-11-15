-- Versions publiées de l'appli. Les APK eux-mêmes sont sur GitHub Releases :
-- on ne stocke que le lien, la taille (indicative) et le compteur.
CREATE TABLE IF NOT EXISTS versions (
    id            TEXT    PRIMARY KEY,               -- 12 caractères hexadécimaux
    version_name  TEXT    NOT NULL,                  -- ex. 1.2.0
    version_code  INTEGER NOT NULL UNIQUE,           -- versionCode Android
    notes         TEXT    NOT NULL DEFAULT '',
    url           TEXT    NOT NULL,                  -- lien GitHub Releases (.apk)
    size          INTEGER,                           -- octets, NULL si inconnue
    created_at    INTEGER NOT NULL,                  -- timestamp Unix (secondes)
    downloads     INTEGER NOT NULL DEFAULT 0
);