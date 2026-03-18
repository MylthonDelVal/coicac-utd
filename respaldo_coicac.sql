-- ==========================================
-- SCRIPT SQL 
-- Proyecto: COICAC UTD 2026
-- ==========================================

-- 1. Tabla de Modalidades
CREATE TABLE modalidades (
    id SERIAL PRIMARY KEY, 
    nombre TEXT NOT NULL,
    descripcion TEXT 
);

-- Insertar datos iniciales 
INSERT INTO modalidades (id, nombre) VALUES 
(1, 'Asistente'), 
(2, 'Ponente'), 
(3, 'Cartel');

-- 2. Tabla Principal de Participantes

CREATE TABLE participantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_completo TEXT NOT NULL,
    matricula TEXT, 
    escuela TEXT,
    correo TEXT NOT NULL UNIQUE,
    url_comprobante TEXT,
    estatus_pago TEXT DEFAULT 'pendiente', 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    asistencia_dia1 BOOL DEFAULT FALSE, 
    modalidad TEXT, 
    asistencia_dia2 BOOL DEFAULT FALSE, 
    asistencia_dia3 BOOL DEFAULT FALSE, 
    modalidad_id INTEGER REFERENCES modalidades(id) 
);

-- 3. Tabla de Asistencias 
CREATE TABLE asistencias (
    id SERIAL PRIMARY KEY, 
    nombre_alumno TEXT,
    matricula TEXT,
    fecha_hora TIMESTAMP WITH TIME ZONE,
    asistencia_registrada BOOL
);

-- 4. Tabla de Control de Asistencia 
CREATE TABLE control_asistencia (
    id SERIAL PRIMARY KEY,
    participante_id UUID REFERENCES participantes(id) ON DELETE CASCADE, 
    dia_numero INTEGER, 
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);