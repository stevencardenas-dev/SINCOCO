-- HU-02 · CU-02: datos de prueba para registrar proyectos.
-- Complementa docs/seed_usuarios_prueba.sql (que solo siembra usuarios,
-- roles y trabajadores). Cliente de prueba único y re-ejecutable.
INSERT INTO clientes (numero_documento, tipo_documento, razon_social_nombre, nombre_contacto, telefono, email)
VALUES ('900123456-1', 'NIT', 'Constructora XYZ S.A.S.', 'Departamento de vivienda', '555-0101', 'vivienda@constructoraxyz.test')
ON DUPLICATE KEY UPDATE razon_social_nombre = VALUES(razon_social_nombre);
