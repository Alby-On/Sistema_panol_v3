// controller.js
import * as Model from './model.js';

// ----------------------------------------
// NAVEGACIÓN (Controla qué vista mostrar)
// ----------------------------------------

const welcomeBox = document.getElementById("welcomeBox");
const loginBox = document.getElementById("loginBox");
const registerBox = document.getElementById("registerBox");

function hideAll() {
    welcomeBox.classList.add("hidden");
    loginBox.classList.add("hidden");
    registerBox.classList.add("hidden");
}

export function showWelcome() { hideAll(); welcomeBox.classList.remove("hidden"); }
export function showLogin() { hideAll(); loginBox.classList.remove("hidden"); }
export function showRegister() { hideAll(); registerBox.classList.remove("hidden"); }

// ----------------------------------------
// MANEJADORES DE EVENTOS
// ----------------------------------------

/**
 * Intenta registrar un nuevo usuario.
 */
export async function registrar() {
    // Obtener valores de la Vista (Inputs)
    const nombre = document.getElementById("regNombre").value.trim();
    const rut = document.getElementById("regRut").value.trim();
    const carrera = document.getElementById("regCarrera").value;
    const telefono = document.getElementById("regTelefono").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const pass = document.getElementById("regPass").value.trim();

    const mensajeEl = document.getElementById("mensaje");
    const rutErrorEl = document.getElementById("rutError");
    mensajeEl.style.backgroundColor = "transparent";
    rutErrorEl.textContent = "";

    // Validación de entrada (mínima)
    if (!nombre || !rut || !carrera || !telefono || !email || !pass) {
        mostrarMensaje(mensajeEl, "⚠️ Complete todos los campos.", "error");
        return;
    }

    const rutVal = Model.validarRutCompleto(rut);
    if (!rutVal.ok) {
        rutErrorEl.textContent = rutVal.msg;
        return;
    }
    
    if (!/^\+569\d{8}$/.test(telefono)) {
        mostrarMensaje(mensajeEl, "⚠️ Teléfono inválido. Use +569XXXXXXXX", "error");
        return;
    }

    // Llamada al Modelo
    const result = await Model.registrarUsuario({ nombre, rut, carrera, telefono, email, pass });

    // Actualizar la Vista
    if (result.success) {
        mostrarMensaje(mensajeEl, `✅ ${result.message}`, "success");
    } else {
        mostrarMensaje(mensajeEl, `❌ ${result.message}`, "error");
    }
}

/**
 * Intenta iniciar sesión.
 */
export async function login() {
    // Obtener valores de la Vista (Inputs)
    const email = document.getElementById("loginEmail").value.trim();
    const pass = document.getElementById("loginPass").value.trim();
    const msgEl = document.getElementById("loginMsg");
    msgEl.style.backgroundColor = "transparent";

    // Validación de entrada
    if (!email || !pass) {
        mostrarMensaje(msgEl, "⚠️ Complete todos los campos.", "error");
        return;
    }

    // Llamada al Modelo
    const result = await Model.loginUsuario(email, pass);

    // Actualizar la Vista y manejar la redirección
    if (result.success) {
        localStorage.setItem("currentUser", JSON.stringify(result.perfil));
        mostrarMensaje(msgEl, `✅ Bienvenido, ${result.perfil.nombre}`, "success");

        setTimeout(() => {
            window.location.href = "menu.html";
        }, 1200);
    } else {
        mostrarMensaje(msgEl, `❌ ${result.message}`, "error");
    }
}

// ----------------------------------------
// FUNCIONES DE VISTA (Funcionalidad de apoyo al controlador)
// ----------------------------------------

/**
 * Muestra un mensaje de estado en un elemento.
 * @param {HTMLElement} element - Elemento DOM para el mensaje.
 * @param {string} text - Contenido del mensaje.
 * @param {'success' | 'error'} type - Tipo de mensaje para el color de fondo.
 */
function mostrarMensaje(element, text, type) {
    element.textContent = text;
    element.style.color = type === "error" ? "red" : "green";
    element.style.backgroundColor = type === "error" ? "#ffdddd" : "#ddffdd";
}


// Inicialización al cargar la página
export function init() {
    // 1. Manejar el redireccionamiento de Supabase si viene de confirmación de email
    Model.handleRedirect();
    
    // 2. Mostrar la vista inicial
    showWelcome();
}
