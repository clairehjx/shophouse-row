import Avatar from './Avatar.jsx';
import ItemSprite from './ItemSprite.jsx';

// Brief overlay played when a character eats/sips an item: the avatar chews while
// the food/drink floats up to its mouth and vanishes. ~1.1s, then onDone clears it.
export default function ConsumeAnimation({ avatar, itemId, verb }) {
  const drink = verb === 'Sipped';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30">
      <div className="panel p-6 flex flex-col items-center">
        <div className="relative">
          <div className="chew"><Avatar data={avatar} scale={6} /></div>
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '38%' }}>
            <div className={drink ? 'sip-up' : 'bite-up'}>
              <ItemSprite id={itemId} scale={3} />
            </div>
          </div>
        </div>
        <div className="pixel-text text-sm text-ink mt-3">{drink ? 'Sip~ 🧋' : 'Yum! 😋'}</div>
      </div>
    </div>
  );
}
