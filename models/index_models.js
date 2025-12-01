// model.js

// ----------------------------------------
// CONFIGURACIÓN SUPABASE
// ----------------------------------------
// Nota: Las claves deben ser manejadas con seguridad en una aplicación real.
// En un entorno de desarrollo cliente-side, se exponen, pero para producción
// se recomienda usar una capa de servidor o funciones de edge.
const SUPABASE_URL = "https://jwcgiuhdugjunndfpdjr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3Y2dpdWhkdWdqdW5uZGZwZGpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NTA2NTQsImV4cCI6MjA3ODUyNjY1NH0.llknOTpK1hFMDOjdyDUKUFuiyr0NwwJzNv6YdJbBsRY";
export const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ----------------------------------------
// LÓGICA DE NEGOCIO Y DATOS
// ----------------------------------------

/**
 * Limpia el RUT de puntos y espacios, y lo convierte a mayúsculas.
 * @param {string} rut
 * @returns {string} RUT limpio.
 */
function limpiarRut(rut) {
    return rut.replace(/\./g, '').replace(/\s/g, '').toUpperCase();
}

/**
 * Calcula el dígito verificador (DV) chileno.
 * @param {number} rut - Parte numérica del RUT.
 * @returns {string} El DV (1-9, K, o 0).
 */
function dvT(rut) {
    let M = 0, S = 1;
    for (; rut; rut = Math.floor(rut / 10)) S = (S + rut % 10 * (9 - M++ % 6)) % 11;
    return S ? S - 1 : 'K';
}

/**
 * Valida el formato y el dígito verificador de un RUT chileno.
 * @param {string} rutCompleto - RUT con guion (Ej: 12345678-5).
 * @returns {{ok: boolean, msg?: string}} Objeto con resultado y mensaje de error si aplica.
 */
export function validarRutCompleto(rutCompleto) {
    if (!rutCompleto) return { ok: false, msg: "Debe ingresar un RUT." };
    const r = limpiarRut(rutCompleto);
    if (!r.includes('-')) return { ok: false, msg: "El RUT debe contener guion." };
    const [num, dv] = r.split('-');
    if (!/^\d+$/.test(num)) return { ok: false, msg: "La parte numérica debe ser solo números." };
    
    // Verificar que el DV sea válido (número o 'K')
    if (!/^[0-9K]$/i.test(dv)) return { ok: false, msg: "Dígito verificador inválido." };
    
    return { ok: dvT(parseInt(num, 10)).toString() === dv.toUpperCase() };
}

// ----------------------------------------
// FUNCIONES DE ACCESO A DATOS (Supabase)
// ----------------------------------------

/**
 * Registra un nuevo usuario en Supabase Auth y crea su perfil.
 * @param {{nombre: string, rut: string, carrera: string, telefono: string, email: string, pass: string}} userData
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function registrarUsuario(userData) {
    const { email, pass, nombre, rut, carrera, telefono } = userData;
    
    // 1. Crear usuario en AUTH
    const { error: e1 } = await supabaseClient.auth.signUp({
        email,
        password: pass
    });

    if (e1) {
        return { success: false, message: e1.message };
    }

    // 2. Guardar datos en tabla 'usuarios'
    const { error: e2 } = await supabaseClient.from("usuarios").insert([
        { nombre, rut, carrera, telefono, email }
    ]);

    if (e2) {
        // En caso de error al guardar perfil, idealmente se debería eliminar el usuario
        // de AUTH, pero simplificaremos por ahora.
        return { success: false, message: "Error al guardar perfil: " + e2.message };
    }

    return { success: true, message: "Registro exitoso. Revisa tu correo para confirmar." };
}

/**
 * Inicia sesión de un usuario.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, message: string, perfil?: object}>}
 */
export async function loginUsuario(email, password) {
    // 1. Autenticar
    const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        return { success: false, message: "Correo o contraseña incorrectos." };
    }

    // 2. Obtener perfil
    const { data: perfil, error: perfilError } = await supabaseClient
        .from("usuarios")
        .select("*")
        .eq("email", email)
        .single();
        
    if (perfilError) {
         return { success: false, message: "Error al cargar el perfil del usuario." };
    }

    return { success: true, message: "Ingreso exitoso.", perfil };
}

/**
 * Maneja la redirección después de la confirmación de email (URL hash).
 */
export async function handleRedirect() {
    const hash = window.location.hash;
    if (hash.includes("access_token")) {
        const params = new URLSearchParams(hash.slice(1));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        await supabaseClient.auth.setSession({ access_token, refresh_token });

        window.location.href = "menu.html"; // Redirigir a la página principal
    }
}
