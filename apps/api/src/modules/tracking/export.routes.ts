// PRD §5.2 — Export PDF per medico/nutrizionista. Sintesi di peso, misure
// e aderenza in un singolo documento. pdfkit lo serve come stream.

// eslint-disable-next-line import/default
import type { FastifyPluginAsync } from 'fastify';
import PDFDocument from 'pdfkit';

import { requireAuth } from '../../plugins/auth.js';

const ITALIAN_DATE = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export const trackingExportRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/me/tracking/export.pdf', { preHandler: requireAuth() }, async (request, reply) => {
    const userId = request.user!.id;
    const userEmail = request.user!.email ?? '—';

    const [profile, entries, currentPlan] = await Promise.all([
      fastify.prisma.profile.findUnique({ where: { userId } }),
      fastify.prisma.weightEntry.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 30,
      }),
      fastify.prisma.mealPlan.findFirst({
        where: { userId, status: 'ACTIVE' },
        orderBy: { weekStart: 'desc' },
        include: {
          slots: {
            include: {
              selected: { select: { kcal: true, proteinG: true, fatG: true, netCarbG: true } },
            },
          },
        },
      }),
    ]);

    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', 'attachment; filename="ketopath-export.pdf"');
    reply.send(doc);

    // ── Header ─────────────────────────────────────────────────────────
    doc
      .fillColor('#221d18')
      .font('Helvetica-Bold')
      .fontSize(22)
      .text('KetoPath', { continued: true })
      .fillColor('#9a3f29')
      .text('.');
    doc
      .moveDown(0.2)
      .fillColor('#3d3530')
      .font('Helvetica')
      .fontSize(9)
      .text(`Sintesi tracking — ${userEmail}`)
      .text(`Generato il ${ITALIAN_DATE.format(new Date())}`);
    doc
      .moveDown(1)
      .strokeColor('#bdb6a3')
      .lineWidth(0.5)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    // ── Profile summary ────────────────────────────────────────────────
    doc.moveDown(1).fillColor('#221d18').font('Helvetica-Bold').fontSize(11).text('PROFILO');
    doc.font('Helvetica').fontSize(10).fillColor('#3d3530');
    if (profile) {
      const weightStart = Number(profile.weightStartKg);
      const weightCurrent = Number(profile.weightCurrentKg);
      const weightGoal = Number(profile.weightGoalKg);
      const lostKg = weightStart - weightCurrent;
      doc
        .moveDown(0.3)
        .text(`Età ${profile.age} · ${profile.gender} · ${profile.heightCm} cm`)
        .text(
          `Peso iniziale ${weightStart.toFixed(1)} kg · attuale ${weightCurrent.toFixed(1)} kg · obiettivo ${weightGoal.toFixed(1)} kg`,
        )
        .text(`Variazione: ${lostKg >= 0 ? '-' : '+'}${Math.abs(lostKg).toFixed(1)} kg dall'inizio`)
        .text(`Fase corrente: ${profile.currentPhase}`);
    } else {
      doc.text('Profilo non ancora configurato.');
    }

    // ── Weight history ─────────────────────────────────────────────────
    doc.moveDown(1).fillColor('#221d18').font('Helvetica-Bold').fontSize(11).text('STORICO PESO');
    if (entries.length === 0) {
      doc.font('Helvetica').fontSize(10).fillColor('#3d3530').text('Nessuna pesata registrata.');
    } else {
      doc.font('Helvetica').fontSize(9).fillColor('#3d3530');
      const colX = { date: 50, weight: 200, energy: 320, sleep: 400, hunger: 480 };
      doc.moveDown(0.5).font('Helvetica-Bold').text('Data', colX.date, doc.y, { continued: false });
      const headerY = doc.y - 11;
      doc.text('Peso (kg)', colX.weight, headerY);
      doc.text('Energia', colX.energy, headerY);
      doc.text('Sonno', colX.sleep, headerY);
      doc.text('Fame', colX.hunger, headerY);
      doc.font('Helvetica').moveDown(0.5);
      for (const e of entries) {
        const y = doc.y;
        doc.text(e.date.toISOString().slice(0, 10), colX.date, y);
        doc.text(Number(e.weightKg).toFixed(1), colX.weight, y);
        doc.text(e.energy?.toString() ?? '—', colX.energy, y);
        doc.text(e.sleep?.toString() ?? '—', colX.sleep, y);
        doc.text(e.hunger?.toString() ?? '—', colX.hunger, y);
        doc.moveDown(0.4);
      }
    }

    // ── Current plan summary ───────────────────────────────────────────
    doc.moveDown(1).fillColor('#221d18').font('Helvetica-Bold').fontSize(11).text('PIANO CORRENTE');
    doc.font('Helvetica').fontSize(10).fillColor('#3d3530');
    if (!currentPlan) {
      doc.moveDown(0.3).text('Nessun piano attivo.');
    } else {
      const slotsWithRecipe = currentPlan.slots.filter((s) => s.selected != null);
      const totalKcal = slotsWithRecipe.reduce((acc, s) => acc + (s.selected?.kcal ?? 0), 0);
      const totalP = slotsWithRecipe.reduce((acc, s) => acc + (s.selected?.proteinG ?? 0), 0);
      const totalF = slotsWithRecipe.reduce((acc, s) => acc + (s.selected?.fatG ?? 0), 0);
      const totalC = slotsWithRecipe.reduce((acc, s) => acc + (s.selected?.netCarbG ?? 0), 0);
      const days = new Set(currentPlan.slots.map((s) => s.dayOfWeek)).size || 1;
      const consumedCount = currentPlan.slots.filter((s) => s.consumed || s.isFreeMeal).length;
      doc
        .moveDown(0.3)
        .text(`Settimana del ${currentPlan.weekStart.toISOString().slice(0, 10)}`)
        .text(`Aderenza: ${consumedCount}/${currentPlan.slots.length} pasti consumati`)
        .text(
          `Media giornaliera: ${Math.round(totalKcal / days)} kcal · P ${Math.round(totalP / days)} g · G ${Math.round(totalF / days)} g · C ${Math.round(totalC / days)} g`,
        );
    }

    // ── Footer ─────────────────────────────────────────────────────────
    doc
      .moveDown(2)
      .strokeColor('#bdb6a3')
      .lineWidth(0.5)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();
    doc
      .moveDown(0.5)
      .fontSize(8)
      .fillColor('#7a7060')
      .text(
        'KetoPath è uno strumento di stile di vita: suggerisce, non prescrive. Le indicazioni nutrizionali non sostituiscono il parere del tuo medico.',
      );

    doc.end();
  });
};
