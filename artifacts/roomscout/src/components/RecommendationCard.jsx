import { getBuilding } from '../data/mockRooms.js';
import { IconChevron, IconProjector, IconFood, IconUsers } from './Icons.jsx';

export default function RecommendationCard({ room, rank, isSelected, isChosen, onClick }) {
  return (
    <button
      className={'rec-card' + (isSelected ? ' is-sel' : '') + (isChosen ? ' is-chosen' : '')}
      onClick={() => onClick(room.id)}
      aria-pressed={isSelected}
      data-testid={`card-recommendation-${room.id}`}
    >
      <span className="rec-rank">{rank}</span>
      <span className="rec-main">
        <span className="rec-name">{room.name}</span>
        <span className="rec-meta">
          {getBuilding(room.buildingId)?.short}
          <span><IconUsers width="13" height="13" />{room.capacity}</span>
          {room.projector && <span title="Projector"><IconProjector width="13" height="13" /></span>}
          {room.food && <span title="Food allowed"><IconFood width="13" height="13" /></span>}
        </span>
      </span>
      {isChosen && <span className="chosen-tag">Chosen</span>}
      <IconChevron className="rec-chev" />
    </button>
  );
}
