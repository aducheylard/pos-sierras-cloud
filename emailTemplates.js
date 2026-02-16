// --- UTILIDAD: Formateador de Peso Chileno ---
const formatCLP = (num) => {
    return (num || 0).toLocaleString('es-CL');
};

const generarHtmlBoleta = (data, carrito) => {
    const filas = carrito.map(i => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">
                ${i.nombre} <small style="color:#777;">(x${i.cantidad})</small>
                ${i.numeros_bingo ? `<br><strong style="color: #d63384; font-size: 12px;">🎟️ Cartones: ${i.numeros_bingo}</strong>` : ''}
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">
                $${formatCLP(i.precio * i.cantidad)}
            </td>
        </tr>
    `).join('');

    // Lógica para mostrar saldo/deuda
    let bloqueSaldo = '';
    if (data.mostrarDeuda) {
        let colorSaldo = data.nuevoSaldo > 0 ? '#dc3545' : '#198754';
        let textoSaldo = data.nuevoSaldo > 0 ? 'Deuda Total Acumulada' : 'Saldo a Favor';
        if (data.nuevoSaldo === 0) { colorSaldo = '#6c757d'; textoSaldo = 'Cuenta al Día'; }
        
        bloqueSaldo = `
        <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd; text-align: center;">
            <div style="font-size: 12px; color: #777; margin-bottom: 5px;">Estado de Cuenta Familiar</div>
            <div style="font-size: 16px; color: ${colorSaldo}; font-weight: bold;">
                ${textoSaldo}: $${formatCLP(Math.abs(data.nuevoSaldo))}
            </div>
        </div>`;
    }

    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #0d6efd; padding: 15px; text-align: center; color: white;">
            <h2 style="margin:0;">Boleta Electrónica #${data.id}</h2>
            <small>Sierras de Bellavista</small>
        </div>
        <div style="padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 15px; font-size: 14px;">
                <ul style="list-style: none; padding: 0; margin: 0; display: flex; justify-content: space-between;">
                    <li>🧾 <strong>N° Boleta:</strong> ${data.id}</li>
                    <li>📅 <strong>Fecha:</strong> ${new Date(data.fecha).toLocaleString('es-CL', { timeZone: 'America/Santiago' })}</li>
                </ul>
                <div style="margin-top: 5px;">👤 <strong>Vendedor:</strong> ${data.vendedor}</div>
                <div style="margin-top: 5px; color: #555;">
                    👨‍👩‍👧‍👦 <strong>Familia:</strong> ${data.familiaNombre} <span style="font-size: 0.9em; color: #888;">(ID: ${data.familiaId})</span>
                </div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background-color: #eee;">
                        <th style="padding: 8px; text-align: left;">Item</th>
                        <th style="padding: 8px; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${filas}
                </tbody>
                <tfoot>
                    <tr>
                        <td style="padding: 8px; font-weight: bold; text-align: right;">TOTAL A PAGAR</td>
                        <td style="padding: 8px; font-weight: bold; text-align: right; font-size: 18px;">$${formatCLP(data.total)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; text-align: right; color: #666;">Método de Pago</td>
                        <td style="padding: 8px; text-align: right; color: #666;">${data.metodo}</td>
                    </tr>
                </tfoot>
            </table>
            
            ${bloqueSaldo}
            
            <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">Gracias por tu compra.</p>
        </div>
    </div>
    `;
};

const generarHtmlBienvenida = (nombre, vendedor, deuda) => {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #198754; padding: 15px; text-align: center; color: white;">
            <h2 style="margin:0;">¡Bienvenidos a Sierras POS!</h2>
        </div>
        <div style="padding: 20px; text-align: center;">
            <h3>Hola, Familia ${nombre} 👋</h3>
            <p>Su cuenta ha sido creada exitosamente en nuestro sistema.</p>
            <p>Ahora podrán realizar compras fiadas o pagar al contado de manera más rápida.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <strong>Estado Inicial:</strong><br>
                ${deuda > 0 ? `<span style="color: #dc3545;">Deuda pendiente: $${formatCLP(deuda)}</span>` : '<span style="color: #198754;">Cuenta inicial en $0.</span>'}
            </div>
            
            <p style="font-size: 12px; color: #999;">Cuenta creada por: ${vendedor}</p>
        </div>
    </div>
    `;
};

const generarHtmlAnulacion = (venta, carrito) => {
    const fecha = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
    const filas = carrito.map(i => `
        <tr style="border-bottom: 1px solid #f5c6cb;">
            <td style="padding: 10px; color: #721c24;">
                ${i.nombre}
                ${i.numeros_bingo ? `<br><span style="font-size:11px; background:#fff; border:1px solid #d63384; color:#d63384; padding:2px 4px; border-radius:4px;">🎟️ Cartones: ${i.numeros_bingo}</span>` : ''}
                </td>
            <td style="padding: 10px; text-align: center; color: #721c24;">${i.cantidad}</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #721c24;">$${formatCLP(i.precio * i.cantidad)}</td>
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
                💳 Método Original: <strong>${venta.metodo_pago}</strong>
            </div>

            <div style="font-size: 14px; color: #555; margin-bottom: 15px; border-top: 1px dashed #f5c6cb; padding-top: 8px;">
                👨‍👩‍👧‍👦 <strong>Familia:</strong> ${venta.familia_nombre} <span style="font-size: 0.9em; color: #888;">(ID: ${venta.familia_id})</span>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead><tr style="background-color: #f1b0b7;"><th style="padding: 10px; text-align: left; color: #721c24;">Producto</th><th style="padding: 10px; text-align: center; color: #721c24;">Cant.</th><th style="padding: 10px; text-align: right; color: #721c24;">Monto</th></tr></thead>
                <tbody>${filas}</tbody>
                <tfoot>
                    <tr>
                        <td colspan="2" style="padding: 15px 10px; text-align: right; font-size: 16px;"><strong>Total Anulado:</strong></td>
                        <td style="padding: 15px 10px; text-align: right; font-size: 18px; color: #dc3545; text-decoration: line-through;"><strong>$${formatCLP(venta.total)}</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>`;
};


function generarHtmlCobranza(familiaNombre, familiaId, deudaTotal) {
    // Formatear la deuda con puntos
    const deudaStr = deudaTotal.toLocaleString('es-CL');

    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0d6efd; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">🏔️ Sierras de Bellavista</h2>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Fe de erratas Nº2: Error en el RUT. Aviso de Saldo Pendiente</p>
        </div>
        
        <div style="padding: 30px 20px; background-color: #fcfcfc;">
            <p style="font-size: 16px; color: #333;">
                Hola <strong>Familia ${familiaNombre}</strong><br>
                <span style="color: #6c757d; font-size: 14px;">(Familia N° ${familiaId})</span>
            </p>
            <p style="font-size: 16px; color: #555; line-height: 1.5;">
                Esperamos que se encuentren muy bien. Les escribimos para informarles el estado actual de su cuenta familiar.
            </p>

            <div style="background-color: #fff; border: 2px solid #dc3545; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                <p style="margin: 0; color: #6c757d; font-size: 14px; text-transform: uppercase; font-weight: bold;">Saldo Total a Pagar *</p>
                <h1 style="margin: 10px 0 0 0; color: #dc3545; font-size: 36px;">$${deudaStr}</h1>
                <p style="margin: 12px 0 0 0; color: #856404; font-size: 12px; background-color: #fff3cd; padding: 5px; border-radius: 4px; display: inline-block;">
                    <em>* Este monto corresponde exclusivamente a compras por "Cuenta Familiar". Las compras pagadas en efectivo no forman parte de este monto.</em>
                </p>
            </div>

            <h3 style="color: #333; margin-top: 30px;">🏦 ¿Cómo realizar el pago?</h3>
            <p style="font-size: 15px; color: #555; line-height: 1.6;">
                Por favor, realice una transferencia bancaria a los siguientes datos:
            </p>
            
            <div style="background-color: #e9ecef; padding: 15px; border-radius: 6px; font-size: 14px; color: #333; line-height: 1.6;">
                <strong>Banco:</strong> Banco BCI<br>
                <strong>Tipo de Cuenta:</strong> Cuenta Corriente<br>
                <strong>Número:</strong> 12615064<br>
                <strong>RUT:</strong> 71.122.200-6<br>
                <strong>Nombre:</strong> Corporacion Sierras de Bellavista<br>
                <strong>Email:</strong> cobranzas@sierrasdebellavista.cl<br>
                <strong>Motivo:</strong> Pago semana bellavistina Familia Nº ${familiaId} ${familiaNombre}
            </div>
            
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-top: 20px; color: #856404; font-size: 15px;">
                <strong>⚠️ MUY IMPORTANTE:</strong><br>
                En el mensaje o <em>detalle de la transferencia</em> de su banco, por favor escriba:<br>
                <span style="font-size: 16px; font-weight: bold; display: block; margin-top: 5px;">"Pago semana bellavistina Familia Nº ${familiaId} ${familiaNombre}"</span>
            </div>
            
            <p style="font-size: 14px; color: #dc3545; font-weight: bold; margin-top: 20px;">
                * Recuerde enviar el comprobante de transferencia al correo indicado para rebajar su saldo en el sistema.
            </p>
        </div>
        
        <div style="background-color: #f8f9fa; color: #6c757d; padding: 15px; text-align: center; font-size: 12px; border-top: 1px solid #ddd;">
            Este es un correo automático generado por el sistema POS de Sierras de Bellavista.<br>
            Por favor no responda directamente a este correo.
        </div>
    </div>
    `;
}

module.exports = { generarHtmlBoleta, generarHtmlBienvenida, generarHtmlAnulacion, generarHtmlCobranza};