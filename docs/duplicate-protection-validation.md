# Validación local de la protección de duplicados

SQL probado: `supabase/prevent-fourvenues-duplicates.sql`.
Importador probado: `automation/fourvenues-extractor/dashboard.html`, en su repositorio separado.

Se ejecutó el SQL en PostgreSQL portátil 18.4 con una tabla de prueba y las 84 fichas del informe de duplicados. No se conectó con producción ni se modificaron registros reales.

## Resultado: 11 comprobaciones correctas

- Aplicar el SQL dos veces conserva las 84 filas existentes, incluidos sus identificadores y slugs.
- Un evento nuevo se inserta; repetirlo con otro canal, parámetros o barra final devuelve `23505`.
- Un identificador que ya tiene duplicados históricos no admite una tercera copia.
- Editar el nombre conserva el identificador y el slug.
- Dos conexiones con altas simultáneas del mismo identificador guardan una sola fila. Se comprobó que la segunda conexión espera el bloqueo y después recibe `23505`.
- Una inserción cancelada con rollback permite reintentar.
- El trigger detecta la ficha existente aunque RLS la oculte al usuario que inserta. Ese usuario no tiene permiso de invocación directa de la función del trigger.
- La función real del importador detecta alias con distintos canales y nombres, usando respuestas simuladas de Supabase.
- La actualización de un identificador con varias fichas devuelve un error explícito.
- Un error de consulta detiene el alta antes de insertar.
- Navegador y SQL interpretan igual los enlaces probados, incluidos dominio en mayúsculas, ruta directa, parámetros y dominios ajenos.

## Alcance y publicación pendiente

La prueba de concurrencia usa READ COMMITTED. La protección SQL cubre INSERT, no cambios posteriores del identificador externo mediante UPDATE. La tabla local es una reproducción mínima; aún hay que verificar compatibilidad con los triggers y permisos del proyecto antes de aplicar el SQL en Supabase.

No se fusionaron los 42 pares existentes. Sus URLs siguen intactas. El importador bloquea la actualización ambigua hasta que se decida qué ficha gestionar.

El SQL no necesita una dependencia nueva en WWG. PostgreSQL portátil y el informe visual viven en `.wwg-validation`, fuera de ambos repositorios. No se ha realizado commit, push ni despliegue.

Referencia: https://www.postgresql.org/docs/current/explicit-locking.html
