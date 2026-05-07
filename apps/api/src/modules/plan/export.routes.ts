// PRD §5.1 — Export PDF del piano settimanale, stampabile.
// 7 giorni × 4 pasti (o quelli effettivamente schedulati dal protocollo)
// con macros, tempi di preparazione e una lista spesa aggregata in coda.

import type { FastifyPluginAsync } from 'fastify';
// eslint-disable-next-line import/default
import PDFDocument from 'pdfkit';

import { requireAuth } from '../../plugins/auth.js';
import { requirePro } from '../../plugins/require-pro.js';

const ITALIAN_DATE = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const DAY_LABELS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

const MEAL_LABELS: Record<string, string> = {
  COLAZIONE: 'Colazione',
  PRANZO: 'Pranzo',
  SPUNTINO: 'Spuntino',
  CENA: 'Cena',
};

export const planExportRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/me/meal-plans/export.pdf',
    { preHandler: [requireAuth(), requirePro()] },
    async (request, reply) => {
      const userId = request.user!.id;

      const plan = await fastify.prisma.mealPlan.findFirst({
        where: { userId, status: 'ACTIVE' },
        orderBy: { weekStart: 'desc' },
        include: {
          slots: {
            include: {
              selected: {
                include: {
                  ingredients: { include: { ingredient: true } },
                },
              },
            },
            orderBy: [{ dayOfWeek: 'asc' }, { meal: 'asc' }],
          },
        },
      });

      if (!plan) {
        return reply.code(404).send({ error: 'plan_not_found' });
      }

      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
      // Bufferizziamo i chunks: fastify + pdfkit stream hanno una race se
      // facciamo `reply.send(doc)` e poi `doc.end()`. Con il buffer chiudiamo
      // il PDF prima di inviarlo e siamo sicuri che il body sia completo.
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      const done = new Promise<Buffer>((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
      });

      // ── Header ───────────────────────────────────────────────────────────
      doc
        .fillColor('#221d18')
        .font('Helvetica-Bold')
        .fontSize(22)
        .text('KetoPath', { continued: true })
        .fillColor('#9a3f29')
        .text('.');

      const weekStartDate = new Date(plan.weekStart);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      doc
        .moveDown(0.2)
        .fillColor('#3d3530')
        .font('Helvetica')
        .fontSize(9)
        .text(
          `Piano settimanale — ${ITALIAN_DATE.format(weekStartDate)} → ${ITALIAN_DATE.format(weekEndDate)}`,
        )
        .text(`Generato il ${ITALIAN_DATE.format(new Date())}`);

      doc
        .moveDown(1)
        .strokeColor('#bdb6a3')
        .lineWidth(0.5)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke();

      // ── Days ─────────────────────────────────────────────────────────────
      const slotsByDay = new Map<number, typeof plan.slots>();
      for (const s of plan.slots) {
        const arr = slotsByDay.get(s.dayOfWeek) ?? [];
        arr.push(s);
        slotsByDay.set(s.dayOfWeek, arr);
      }

      for (let day = 0; day < 7; day++) {
        const slots = slotsByDay.get(day) ?? [];

        // Forza una nuova pagina se manca spazio
        if (doc.y > 720) doc.addPage();

        doc.moveDown(0.8).fillColor('#221d18').font('Helvetica-Bold').fontSize(13);
        doc.text(DAY_LABELS[day] ?? `Giorno ${day + 1}`);

        if (slots.length === 0) {
          doc
            .moveDown(0.2)
            .fillColor('#7a7060')
            .font('Helvetica-Oblique')
            .fontSize(9)
            .text('Giorno di digiuno completo — solo acqua, tè e tisane.');
          continue;
        }

        const dayKcal = slots.reduce((acc, s) => acc + (s.selected?.kcal ?? 0), 0);
        const dayP = slots.reduce((acc, s) => acc + (s.selected?.proteinG ?? 0), 0);
        const dayF = slots.reduce((acc, s) => acc + (s.selected?.fatG ?? 0), 0);
        const dayC = slots.reduce((acc, s) => acc + (s.selected?.netCarbG ?? 0), 0);

        doc
          .fillColor('#7a7060')
          .font('Helvetica')
          .fontSize(8)
          .text(
            `${Math.round(dayKcal)} kcal · P ${Math.round(dayP)} g · G ${Math.round(dayF)} g · C ${Math.round(dayC)} g`,
          );

        for (const slot of slots) {
          if (slot.isFreeMeal) {
            doc
              .moveDown(0.4)
              .fillColor('#9a3f29')
              .font('Helvetica-Oblique')
              .fontSize(10)
              .text(`${MEAL_LABELS[slot.meal] ?? slot.meal}: pasto libero (~750 kcal stimate)`);
            continue;
          }
          if (!slot.selected) continue;

          doc
            .moveDown(0.4)
            .fillColor('#221d18')
            .font('Helvetica-Bold')
            .fontSize(10)
            .text(MEAL_LABELS[slot.meal] ?? slot.meal, { continued: true })
            .fillColor('#3d3530')
            .font('Helvetica')
            .text(`  ·  ${slot.selected.name}`);
          doc
            .fillColor('#7a7060')
            .fontSize(8)
            .text(
              `   ${Math.round(slot.selected.kcal)} kcal · P ${Math.round(slot.selected.proteinG)} · G ${Math.round(slot.selected.fatG)} · C ${Math.round(slot.selected.netCarbG)} · ${slot.selected.prepMinutes} min`,
            );
        }
      }

      // ── Lista spesa ──────────────────────────────────────────────────────
      doc.addPage();
      doc.fillColor('#221d18').font('Helvetica-Bold').fontSize(16).text('Lista della spesa');
      doc
        .moveDown(0.3)
        .fillColor('#7a7060')
        .font('Helvetica-Oblique')
        .fontSize(9)
        .text('Quantità totali per la settimana, raggruppate per reparto.');

      type AggLine = { name: string; quantity: number; unit: string };
      const byCategory = new Map<string, Map<string, AggLine>>();
      for (const slot of plan.slots) {
        if (!slot.selected || slot.isFreeMeal) continue;
        for (const ri of slot.selected.ingredients) {
          const cat = ri.ingredient.category;
          if (!byCategory.has(cat)) byCategory.set(cat, new Map());
          const items = byCategory.get(cat)!;
          const key = `${ri.ingredient.name}::${ri.unit}`;
          const existing = items.get(key);
          if (existing) {
            existing.quantity += ri.quantity;
          } else {
            items.set(key, {
              name: ri.ingredient.name,
              quantity: ri.quantity,
              unit: ri.unit,
            });
          }
        }
      }

      const sortedCategories = Array.from(byCategory.keys()).sort((a, b) =>
        a.localeCompare(b, 'it'),
      );
      for (const cat of sortedCategories) {
        doc
          .moveDown(0.7)
          .fillColor('#221d18')
          .font('Helvetica-Bold')
          .fontSize(11)
          .text(cat.toUpperCase());
        const items = Array.from(byCategory.get(cat)!.values()).sort((a, b) =>
          a.name.localeCompare(b.name, 'it'),
        );
        doc.font('Helvetica').fontSize(10).fillColor('#3d3530');
        for (const it of items) {
          const qty = Number.isInteger(it.quantity) ? String(it.quantity) : it.quantity.toFixed(1);
          doc.text(`  • ${it.name} — ${qty} ${it.unit}`);
        }
      }

      // ── Footer ───────────────────────────────────────────────────────────
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc
          .fillColor('#7a7060')
          .font('Helvetica')
          .fontSize(7)
          .text(
            'KetoPath — uno strumento di stile di vita, non sostituisce il parere medico.',
            50,
            800,
            { align: 'center', width: 495 },
          );
      }

      doc.end();
      const pdfBuffer = await done;
      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', 'attachment; filename="ketopath-piano.pdf"')
        .header('Content-Length', String(pdfBuffer.length))
        .send(pdfBuffer);
    },
  );
};
