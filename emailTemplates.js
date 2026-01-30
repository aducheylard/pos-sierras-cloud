// emailTemplates.js

function generarHtmlBienvenida(nombre, vendedor, deuda) {
    const fecha = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #2c3e50; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">¡Bienvenidos a Sierras POS! 🏔️</h1>
        </div>
        <div style="padding: 20px; background-color: #ffffff;">
            <h2 style="color: #333;">Hola, Familia ${nombre}</h2>
            <p style="color: #666;">Su cuenta familiar ha sido creada exitosamente.</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="margin-bottom: 10px;">📅 <strong>Fecha:</strong> ${fecha}</li>
                    <li style="margin-bottom: 10px;">👤 <strong>Atendido por:</strong> ${vendedor}</li>
                    <li>💰 <strong>Saldo Inicial:</strong> $${deuda}</li>
                </ul>
            </div>
        </div>
    </div>`;
}

function generarHtmlBoleta(data, carrito) {
    const fecha = new Date(data.fecha).toLocaleString('es-CL', { timeZone: 'America/Santiago' });
    
    // Mostramos el ID si existe, si no, un guion
    const idBoleta = data.id ? data.id : '-'; 

    const filas = carrito.map(i => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; color: #333;">${i.nombre}</td>
            <td style="padding: 10px; text-align: center; color: #333;">${i.cantidad}</td>
            <td style="padding: 10px; text-align: right; color: #333;">$${i.precio}</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #333;">$${i.precio * i.cantidad}</td>
        </tr>`).join('');

    let bloquePago = '';
    // Lógica para mostrar deuda o solo efectivo
    if (data.metodo === 'Cuenta') {
        // Preparamos la línea de deuda, solo si mostrarDeuda es true
        const lineaDeuda = data.mostrarDeuda 
            ? `<hr style="border-top: 1px solid #ffeeba; margin: 10px 0;">
               <p style="font-size: 1.2em; margin: 0;">📉 Deuda Total Acumulada: <strong>$${data.nuevoSaldo}</strong></p>`
            : ''; // Si es false, esto queda vacío

        bloquePago = `
            <div style="background-color: #fff3cd; color: #856404; padding: 15px; border-radius: 6px; text-align: center; border: 1px solid #ffeeba;">
                <h3 style="margin: 0 0 5px 0;">✅ Cargado a Cuenta Familiar</h3>
                <p style="margin: 5px 0;">Total compra: <strong>$${data.total}</strong></p>
                ${lineaDeuda}
            </div>`;
    } else {
        bloquePago = `
            <div style="background-color: #d1e7dd; color: #0f5132; padding: 15px; border-radius: 6px; text-align: center; border: 1px solid #badbcc;">
                <h3 style="margin: 0;">💵 Pagado con Efectivo</h3>
            </div>`;
    }

    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #0d6efd; padding: 15px; text-align: center; color: white;">
            <h2 style="margin:0;">Boleta Electrónica #${idBoleta}</h2>
            <small>Sierras de Bellavista</small>
        </div>
        <div style="padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 15px; font-size: 14px;">
                <ul style="list-style: none; padding: 0; margin: 0; display: flex; justify-content: space-between;">
                    <li>🧾 <strong>N° Boleta:</strong> ${idBoleta}</li>
                    <li>📅 <strong>Fecha:</strong> ${fecha}</li>
                </ul>
                <div style="margin-top: 5px;">👤 <strong>Vendedor:</strong> ${data.vendedor}</div>
                
                <div style="margin-top: 5px; color: #555;">
                    👨‍👩‍👧‍👦 <strong>Familia:</strong> ${data.familiaNombre} <span style="font-size: 0.9em; color: #888;">(ID: ${data.familiaId})</span>
                </div>
                </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead><tr style="background-color: #f8f9fa;"><th style="padding: 10px; text-align: left;">Producto</th><th style="padding: 10px; text-align: center;">Cant.</th><th style="padding: 10px; text-align: right;">Precio</th><th style="padding: 10px; text-align: right;">Total</th></tr></thead>
                <tbody>${filas}</tbody>
                <tfoot><tr><td colspan="3" style="padding: 15px 10px; text-align: right; font-size: 16px;"><strong>Total:</strong></td><td style="padding: 15px 10px; text-align: right; font-size: 18px; color: #0d6efd;"><strong>$${data.total}</strong></td></tr></tfoot>
            </table>
            ${bloquePago}
        </div>
    </div>`;
}

function generarHtmlAnulacion(venta, carrito) {
    const fecha = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
    const filas = carrito.map(i => `
        <tr style="border-bottom: 1px solid #f5c6cb;">
            <td style="padding: 10px; color: #721c24;">${i.nombre}</td>
            <td style="padding: 10px; text-align: center; color: #721c24;">${i.cantidad}</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #721c24;">$${i.precio * i.cantidad}</td>
        </tr>`).join('');

    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #f5c6cb; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #dc3545; padding: 15px; text-align: center; color: white;">
            <h2 style="margin:0;">🚫 Boleta Anulada #${venta.id}</h2>
            <small>Nota de Crédito / Cancelación</small>
        </div>
        <div style="padding: 20px; background-color: #fff;">
            <p style="color: #721c24; background-color: #f8d7da; padding: 15px; border-radius: 5px; border: 1px solid #f5c6cb;">
                <strong>Aviso:</strong> La transacción <strong>#${venta.id}</strong> ha sido anulada.
            </p>
            
            <div style="display: flex; justify-content: space-between; font-size: 14px; color: #666; margin-bottom: 5px;">
                <span>📅 Fecha Anulación: ${fecha}</span>
                <span>👤 Vendedor: ${venta.vendedor}</span>
            </div>

            <div style="font-size: 14px; color: #666; margin-bottom: 10px;">
                💳 Método de pago original: <strong>${venta.metodo_pago}</strong>
            </div>
            <div style="font-size: 14px; color: #555; margin-bottom: 15px; border-top: 1px dashed #f5c6cb; padding-top: 8px;">
                👨‍👩‍👧‍👦 <strong>Familia:</strong> ${venta.familia_nombre} <span style="font-size: 0.9em; color: #888;">(ID: ${venta.familia_id})</span>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead><tr style="background-color: #f1b0b7;"><th style="padding: 10px; text-align: left; color: #721c24;">Producto</th><th style="padding: 10px; text-align: center; color: #721c24;">Cant.</th><th style="padding: 10px; text-align: right; color: #721c24;">Monto</th></tr></thead>
                <tbody>${filas}</tbody>
                <tfoot><tr><td colspan="2" style="padding: 15px 10px; text-align: right; font-size: 16px;"><strong>Total Anulado:</strong></td><td style="padding: 15px 10px; text-align: right; font-size: 18px; color: #dc3545; text-decoration: line-through;"><strong>$${venta.total}</strong></td></tr></tfoot>
            </table>
        </div>
    </div>`;
}

module.exports = { generarHtmlBoleta, generarHtmlBienvenida, generarHtmlAnulacion };