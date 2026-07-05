-- Таблица для подтверждения смены email кодом (закон о российской почте).
-- Применить на боевой и локальной БД `coffee` перед деплоем фичи.
CREATE TABLE IF NOT EXISTS email_change (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    new_email VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expiration_time VARCHAR(100) NOT NULL
);
