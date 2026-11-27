export async function generarNombreUsuarioDisponible(
    nombreBase: string,
    existeNombreUsuario: (nombreUsuario: string) => Promise<boolean>
): Promise<string> {
    const base = nombreBase.trim().slice(0, 50);
    let candidato = base;
    let sufijo = 2;

    while (await existeNombreUsuario(candidato)) {
        const textoSufijo = ` ${sufijo}`;
        candidato = `${base.slice(0, 50 - textoSufijo.length)}${textoSufijo}`;
        sufijo += 1;
    }

    return candidato;
}
