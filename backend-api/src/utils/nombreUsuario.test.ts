import assert from 'node:assert/strict';
import test from 'node:test';
import { generarNombreUsuarioDisponible } from './nombreUsuario';

test('duplicate first names receive an available numeric username suffix', async () => {
    const existentes = new Set(['TERAPEUTA ANA', 'TERAPEUTA ANA 2']);
    const nombreUsuario = await generarNombreUsuarioDisponible(
        'TERAPEUTA ANA',
        async (nombre) => existentes.has(nombre)
    );

    assert.equal(nombreUsuario, 'TERAPEUTA ANA 3');
});

test('generated usernames remain within the database column length', async () => {
    const nombreBase = `TERAPEUTA ${'A'.repeat(60)}`;
    let firstCheck = true;
    const nombreUsuario = await generarNombreUsuarioDisponible(nombreBase, async () => {
        if (firstCheck) {
            firstCheck = false;
            return true;
        }
        return false;
    });

    assert.equal(nombreUsuario.length, 50);
    assert.match(nombreUsuario, / 2$/);
});
