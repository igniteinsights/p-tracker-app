import { addDays, formatDayMonth } from '../../domain/dates';
import type { Prediction } from '../../domain/predict';
import { ribbonLabel, ribbonTiles } from './ribbonModel';

export function Ribbon({ prediction, onOpen }: { prediction: Prediction; onOpen: () => void }) {
  const tiles = ribbonTiles(prediction);
  const end = addDays(prediction.lastStart, prediction.cycleSpan - 1);
  return (
    <button type="button" className="ribbon" aria-label={ribbonLabel(prediction)} onClick={onOpen}>
      <span className="ribbon__tiles" style={{ gridTemplateColumns: `repeat(${tiles.length}, 1fr)` }} aria-hidden="true">
        {tiles.map((t) => <span key={t.day} className={`ribbon__tile ribbon__tile--${t.kind}`} />)}
      </span>
      <span className="ribbon__labels" aria-hidden="true">
        <span>{formatDayMonth(prediction.lastStart)}</span>
        <span>Ovulation est. {formatDayMonth(prediction.ovulation)}</span>
        <span>{formatDayMonth(end)}</span>
      </span>
    </button>
  );
}
