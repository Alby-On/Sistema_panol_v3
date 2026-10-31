// supabase.js — cliente único de Supabase, compartido por todas las páginas.
// Cargar después del SDK:  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
const supabaseClient = supabase.createClient(
    "https://jwcgiuhdugjunndfpdjr.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3Y2dpdWhkdWdqdW5uZGZwZGpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NTA2NTQsImV4cCI6MjA3ODUyNjY1NH0.llknOTpK1hFMDOjdyDUKUFuiyr0NwwJzNv6YdJbBsRY"
);

// Convierte una fecha que viene de Supabase en un objeto Date correcto.
// Las fechas se guardan en hora UTC. Si la columna no guarda zona horaria,
// Supabase las devuelve sin la "Z" final ("2026-10-26T16:05:00") y el navegador
// las leería como hora de Chile, quedando 3 horas corridas. Aquí se leen siempre como UTC.
function fechaSupabase(valor) {
    if (!valor) return null;
    if (valor instanceof Date) return valor;
    let texto = String(valor).trim().replace(' ', 'T');
    if (!/T\d{2}:\d{2}/.test(texto)) return new Date(texto);   // solo fecha, sin hora
    // "+00" o "+0000" -> "+00:00", que es el formato que entienden todos los navegadores
    texto = texto.replace(/([+-]\d{2})(\d{2})?$/, (m, h, mm) => `${h}:${mm || '00'}`);
    const tieneZona = /([zZ]|[+-]\d{2}:\d{2})$/.test(texto);
    return new Date(tieneZona ? texto : texto + 'Z');
}
