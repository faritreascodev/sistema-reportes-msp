/**
 * Architectural Fitness Functions (Pruebas de Arquitectura Automatizadas)
 *
 * Inspirado en "Building Evolutionary Architectures" (Neal Ford, Mark Richards, Pramod Sadalage).
 * Verifica de forma continua que el sistema cumpla con características de arquitectura:
 * - Características operacionales (Bulkhead, control de concurrencia y resiliencia).
 * - Características estructurales (Modularidad, contratos Zod, delimitación de dominio).
 * - Seguridad por diseño (Segregación de secretos criptográficos en memoria).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reportDataSchema } from "../src/lib/report-types";
import { BulkheadSemaphore } from "../src/lib/server/bulkhead";
import { nuevoReporte } from "../src/lib/defaults";
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from "../src/lib/server/auth";

describe("Fitness Functions de Arquitectura (Características Estructurales y Operacionales)", () => {
  describe("1. Resiliencia Operacional: Patrón Bulkhead (Concurrencia)", () => {
    it("permite adquirir slots concurrentes hasta el límite configurado", async () => {
      const bulkhead = new BulkheadSemaphore(2, 5);
      const rel1 = await bulkhead.acquire();
      const rel2 = await bulkhead.acquire();
      assert.equal(bulkhead.stats.active, 2);
      assert.equal(bulkhead.stats.queued, 0);

      rel1();
      assert.equal(bulkhead.stats.active, 1);
      rel2();
      assert.equal(bulkhead.stats.active, 0);
    });

    it("encola peticiones cuando se alcanza el límite y las despacha ordenadamente", async () => {
      const bulkhead = new BulkheadSemaphore(1, 2);
      const rel1 = await bulkhead.acquire();

      let order: number[] = [];
      const p2 = bulkhead.acquire().then((rel) => {
        order.push(2);
        rel();
      });

      assert.equal(bulkhead.stats.active, 1);
      assert.equal(bulkhead.stats.queued, 1);

      rel1();
      await p2;
      assert.deepEqual(order, [2]);
      assert.equal(bulkhead.stats.active, 0);
    });

    it("rechaza de inmediato peticiones que exceden la capacidad de la cola (Fail-Fast)", async () => {
      const bulkhead = new BulkheadSemaphore(1, 1);
      const rel1 = await bulkhead.acquire();
      const p2 = bulkhead.acquire(); // entra en cola

      // La tercera debe fallar inmediatamente por saturación
      await assert.rejects(
        () => bulkhead.acquire(),
        /Servicio temporalmente saturado/i
      );

      rel1();
      const rel2 = await p2;
      rel2();
    });
  });

  describe("2. Características Estructurales: Validación de Invariantes de Dominio", () => {
    it("el esquema de dominio Zod garantiza Connascence de Tipo y rechaza estados inválidos", () => {
      const sample = { ...nuevoReporte(), componente: "SALUD MENTAL", tema: "PREVENCIÓN DE ESTRÉS" };
      assert.doesNotThrow(() => reportDataSchema.parse(sample));

      // Estado no permitido
      const invalidStatus = { ...sample, status: "PUBLICADO_SIN_PERMISO" };
      assert.throws(() => reportDataSchema.parse(invalidStatus));

      // Fecha malformada
      const invalidDate = { ...sample, fechaActividad: "11/09/2026" };
      assert.throws(() => reportDataSchema.parse(invalidDate));
    });

    it("mantiene la invariante de 4 fotos en el grid estructural", () => {
      const sample = { ...nuevoReporte(), componente: "SALUD MENTAL", tema: "PREVENCIÓN DE ESTRÉS" };
      assert.equal(sample.fotoIds.length, 4);

      // Intentar agregar una 5ta foto debe violar el esquema
      const invalidPhotos = { ...sample, fotoIds: [null, null, null, null, null] };
      assert.throws(() => reportDataSchema.parse(invalidPhotos));
    });
  });

  describe("3. Seguridad por Diseño: Segregación y Privacidad Criptográfica", () => {
    it("los tipos de respuesta pública excluyen deliberadamente claves privadas o buffers de certificados", () => {
      const keys = Object.keys(reportDataSchema.shape);
      assert.ok(!keys.includes("password"));
      assert.ok(!keys.includes("privateKey"));
      assert.ok(!keys.includes("certificate"));
      assert.ok(!keys.includes("p12"));
    });
  });

  describe("4. Autenticación y Control de Sesión: Cédula y Tokens HMAC-SHA256", () => {
    it("el algoritmo de hash (scrypt) produce hashes únicos con salts aleatorios y verifica contraseñas", () => {
      const hash1 = hashPassword("claveSecreta123");
      const hash2 = hashPassword("claveSecreta123");
      assert.notEqual(hash1, hash2, "Dos hashes de la misma clave deben tener salts diferentes");

      assert.ok(verifyPassword("claveSecreta123", hash1));
      assert.ok(verifyPassword("claveSecreta123", hash2));
      assert.equal(verifyPassword("claveIncorrecta", hash1), false);
    });

    it("crea tokens de sesión válidos y detecta adulteraciones de firma", () => {
      const token = createSessionToken({
        id: "usr_123",
        cedula: "0801234567",
        nombre: "ING. MERCEDES TORRES",
        cargo: "ASISTENTE",
        role: "USER",
      });

      const session = verifySessionToken(token);
      assert.ok(session);
      assert.equal(session.cedula, "0801234567");
      assert.equal(session.role, "USER");

      // Adulterar el token debe invalidar la sesión
      const tampered = token.slice(0, -3) + "xyz";
      assert.equal(verifySessionToken(tampered), null);
    });
  });
});
