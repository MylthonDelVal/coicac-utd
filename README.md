# React + Vite

# COICAC UTD - Sistema de Registro & QR

Sistema Full-Stack diseñado para la gestión y validación de asistentes al **Congreso Internacional de Cuerpos Académicos** de la **Universidad Tecnológica de Durango (UTD)**.

## Características
- **Registro de Participantes:** Captura de datos y carga de comprobantes de pago.
- **Validación Staff:** Interfaz protegida para que el staff autorice registros.
- **Escáner Biométrico de QR:** Validación de accesos en tiempo real mediante cámara.
- **Gestión de Modalidades:** Soporte para Ponentes, Asistentes y Carteles.

## Stack Tecnológico
- **Frontend:** React + Vite + Tailwind CSS
- **Backend (BaaS):** Supabase (PostgreSQL)
- **Almacenamiento:** Supabase Storage (para comprobantes)
- **Despliegue:** Vercel

## Configuración
El proyecto requiere las siguientes variables de entorno:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`