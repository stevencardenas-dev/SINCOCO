-- «Empezar» etapa: fecha real de inicio.
ALTER TABLE etapas_proyecto
  ADD COLUMN fecha_inicio_real date DEFAULT NULL AFTER fecha_fin_original;
