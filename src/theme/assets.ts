import { PieceColor, PieceType, ThemeType } from '../chess/types';

export interface ThemeCopy {
  n: string;
  s: string;
  ai: string;
  nw: string;
  sp: string;
  t1: string;
  t2: string;
  e: string;
  m: [string, string];
  nm: string;
}

export const K: Record<ThemeType, ThemeCopy> = {
  flower: {
    n: 'Pion en Fleur',
    s: 'Chess on a living garden. Every pawn is a bud, every capture sheds petals, and every square remembers the game.',
    ai: 'The Gardener',
    nw: 'Replant',
    sp: 'Send petals',
    t1: 'Your turn. Tend a bud. (Giliranmu. Rawat tunasmu)',
    t2: 'The Gardener is thinking… (Tukang kebun sedang berpikir…)',
    e: ' wins: the king has fallen.',
    m: ['Spring', 'Dusk'],
    nm: 'Flower-Bud Cosmos Tulip Daisy Peony Dahlia'
  },
  war: {
    n: 'Kessler Armory',
    s: 'Armada tempur galaksi di orbit. Setiap bidak adalah mesin perang intergalaktik, dipersenjatai tank tempur kosmik dan meriam plasma presisi tinggi.',
    ai: 'The War Machine',
    nw: 'Redeploy',
    sp: 'Send flares',
    t1: 'Target acquired. Commander, launch attack. (Giliranmu, komandan)',
    t2: 'Locking firing solution… (Mengunci target…)',
    e: ' wins: flagship reactor breach.',
    m: ['Hangar', 'Orbit'],
    nm: 'Cosmic-Tank Hover-Tank Gunship Siege Dreadnought Titan'
  },
  beast: {
    n: 'Primal Beasts',
    s: 'Pertarungan predator rimba buas. Setiap bidak adalah binatang buas legendaris bersenjatakan cakar pembelah, taring tajam, dan jejak cakar penyerang.',
    ai: 'The Alpha Predator',
    nw: 'Stalk Prey',
    sp: 'Savage Roar',
    t1: 'Predator prowling. Strike with claws! (Giliranmu, tebas dengan cakar)',
    t2: 'The Alpha is hunting in the shadows… (Sang Alpha sedang mengintai…)',
    e: ' wins: the Apex Lion rules the wild.',
    m: ['Savanna', 'Jungle'],
    nm: 'Dire-Wolf Panther Falcon Gorilla Tigress Lion-King'
  },
  greek: {
    n: 'Mount Olympus',
    s: 'Pertarungan para Dewa Yunani di takhta Olympus. Setiap bidak adalah dewa mitologi legendaris: Zeus pembawa petir langit, Athena ahli taktik perang, Poseidon penguasa samudera, Apollo sang dewa surya, dan Pegasus sang kuda sayap langit.',
    ai: 'Oracle of Delphi',
    nw: 'Ascend Olympus',
    sp: 'Call Lightning',
    t1: 'The Gods await thy command. Strike with divine fury! (Giliranmu, panggil petir dewa)',
    t2: 'The Oracle of Delphi interprets the stars… (Sang Peramal sedang melihat takdir…)',
    e: ' wins: the Pantheon has spoken.',
    m: ['Olympus', 'Aegean'],
    nm: 'Hoplite Pegasus Apollo Poseidon Athena Zeus'
  }
};

// Flower Piece SVGs: Bud (3 varied sizes), Cosmos, Tulip, Daisy, Peony, Dahlia
function getFlowerSVG(type: PieceType, color: PieceColor, sq?: number): string {
  const isWhite = color === 'w';
  const fill = isWhite ? '#f6adc4' : '#a38ddf';
  const stroke = isWhite ? '#a93457' : '#3e2d7a';
  const gold = '#ffd96b';
  const stem = '#558b2f';

  switch (type) {
    case 'p': {
      // Multiple botanical sizes of flower pawn:
      // 0 = Petite Sprout Bud, 1 = Blooming Blossom, 2 = Grand Radiant Bloom
      let sizeIdx = 1;
      if (sq !== undefined) {
        const rank = Math.floor(sq / 8);
        const file = sq % 8;
        // Natural size variation + growth with board advancement
        const advancement = isWhite ? (6 - rank) : (rank - 1);
        if (advancement >= 3) {
          sizeIdx = 2; // Grand bloom near enemy lines!
        } else if (advancement <= 0) {
          // Rank 2/7 initial: varied sizes across garden files
          sizeIdx = (file % 3 === 0) ? 0 : (file % 3 === 1) ? 1 : 2;
        } else {
          sizeIdx = (file % 2 === 0) ? 1 : 2;
        }
      }

      if (sizeIdx === 0) {
        // SIZE 1: Petite Sprout Bud (Delicate sprout, young bud, petite scale)
        return `<svg viewBox="0 0 45 45" class="piece-svg piece-sway flower-pawn-sm" style="transform-origin: 50% 90%; transform: scale(0.82);">
          <path d="M22.5 40 L22.5 27" stroke="${stem}" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M22.5 35 Q16 33 15 30 Q19 29 22.5 33" fill="${stem}"/>
          <path d="M22.5 33 Q29 31 30 28 Q26 27 22.5 31" fill="${stem}"/>
          <!-- Petite teardrop bud with dewy highlight -->
          <path d="M22.5 13 C17 19 16 25 22.5 28 C29 25 28 19 22.5 13 Z" fill="${fill}" stroke="${stroke}" stroke-width="1.8"/>
          <path d="M22.5 16 C20 21 21 24 22.5 26 C24 24 25 21 22.5 16 Z" fill="${gold}" opacity="0.6"/>
          <circle cx="22.5" cy="18" r="1.5" fill="#ffffff" opacity="0.8"/>
        </svg>`;
      } else if (sizeIdx === 1) {
        // SIZE 2: Medium Blossoming Flower (Harmonious opening flower with 5 spreading petals)
        return `<svg viewBox="0 0 45 45" class="piece-svg piece-sway flower-pawn-md" style="transform-origin: 50% 90%; transform: scale(0.98);">
          <path d="M22.5 39 L22.5 24" stroke="${stem}" stroke-width="2.6" stroke-linecap="round"/>
          <path d="M22.5 33 Q14 31 13 26 Q19 25 22.5 30" fill="${stem}"/>
          <path d="M22.5 31 Q31 29 32 24 Q26 23 22.5 28" fill="${stem}"/>
          <!-- Opening blossom petals -->
          <g transform="translate(22.5, 17)">
            ${[0, 72, 144, 216, 288].map(deg =>
              `<ellipse cx="0" cy="-7.5" rx="3.6" ry="6.8" fill="${fill}" stroke="${stroke}" stroke-width="1.3" transform="rotate(${deg})"/>`
            ).join('')}
            <circle cx="0" cy="0" r="4.2" fill="${gold}" stroke="${stroke}" stroke-width="1.4"/>
            <circle cx="0" cy="0" r="2" fill="${isWhite ? '#ffffff' : '#ffd96b'}"/>
          </g>
        </svg>`;
      } else {
        // SIZE 3: Grand Radiant Bloom (Giant lush multi-layered bloom with rich petals & radiant golden crown)
        return `<svg viewBox="0 0 45 45" class="piece-svg piece-sway flower-pawn-lg" style="transform-origin: 50% 90%; transform: scale(1.18);">
          <path d="M22.5 40 L22.5 23" stroke="${stem}" stroke-width="3" stroke-linecap="round"/>
          <path d="M22.5 34 Q12 33 11 27 Q18 26 22.5 31" fill="${stem}"/>
          <path d="M22.5 32 Q33 30 34 25 Q27 24 22.5 29" fill="${stem}"/>
          <!-- Grand Petal Halo -->
          <circle cx="22.5" cy="16" r="14.5" fill="none" stroke="${gold}" stroke-width="1" stroke-dasharray="2 3" opacity="0.6"/>
          <g transform="translate(22.5, 16)">
            <!-- Outer 8 grand petals -->
            ${[0, 45, 90, 135, 180, 225, 270, 315].map(deg =>
              `<path d="M-4 -6 C-3 -11 3 -11 4 -6 C5 -2 2 1 0 2 C-2 1 -5 -2 -4 -6 Z" fill="${fill}" stroke="${stroke}" stroke-width="1.3" transform="rotate(${deg})"/>`
            ).join('')}
            <!-- Inner ring petals -->
            ${[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map(deg =>
              `<circle cx="0" cy="-4.8" r="2.8" fill="${isWhite ? '#ffe4ec' : '#d1c4f5'}" stroke="${stroke}" stroke-width="1" transform="rotate(${deg})"/>`
            ).join('')}
            <circle cx="0" cy="0" r="5" fill="${gold}" stroke="${stroke}" stroke-width="1.5"/>
            <circle cx="0" cy="0" r="2.5" fill="#ffffff"/>
          </g>
        </svg>`;
      }
    }

    case 'n': // Cosmos: 8 asymmetric petals, small curved stem, leaf
      return `<svg viewBox="0 0 45 45" class="piece-svg piece-sway">
        <path d="M22.5 38 Q20 30 22.5 23" stroke="${stem}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M21 32 Q13 32 12 28 Q18 27 21.5 30" fill="${stem}"/>
        <g transform="translate(22.5, 17)">
          ${[0, 45, 90, 135, 180, 225, 270, 315].map(deg => 
            `<ellipse cx="0" cy="-8.5" rx="3.2" ry="6.2" fill="${fill}" stroke="${stroke}" stroke-width="1.2" transform="rotate(${deg})"/>`
          ).join('')}
          <circle cx="0" cy="0" r="4.2" fill="${gold}" stroke="${stroke}" stroke-width="1.2"/>
        </g>
      </svg>`;

    case 'b': // Tulip: cup tulip, S-curved stem, one leaf
      return `<svg viewBox="0 0 45 45" class="piece-svg piece-sway">
        <path d="M22.5 39 C24 32 20 28 22.5 22" stroke="${stem}" stroke-width="2.8" fill="none" stroke-linecap="round"/>
        <path d="M22 34 C12 30 11 18 18 16 C16 24 20 28 22 30" fill="${stem}"/>
        <!-- Cup tulip petals -->
        <path d="M14 13 C12 24 22.5 26 22.5 26 C22.5 26 33 24 31 13 C28 20 24 22 22.5 22 C21 22 17 20 14 13 Z" fill="${fill}" stroke="${stroke}" stroke-width="1.8"/>
        <path d="M22.5 9 C18 15 18 22 22.5 24 C27 22 27 15 22.5 9 Z" fill="${gold}" stroke="${stroke}" stroke-width="1.4" opacity="0.9"/>
      </svg>`;

    case 'r': // Daisy: rounded daisy head, visible center disc
      return `<svg viewBox="0 0 45 45" class="piece-svg piece-sway">
        <rect x="14" y="36" width="17" height="4" rx="2" fill="${stem}"/>
        <path d="M22.5 36 L22.5 23" stroke="${stem}" stroke-width="3" stroke-linecap="round"/>
        <g transform="translate(22.5, 17)">
          ${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => 
            `<ellipse cx="0" cy="-9" rx="2.4" ry="5.5" fill="${fill}" stroke="${stroke}" stroke-width="1" transform="rotate(${deg})"/>`
          ).join('')}
          <circle cx="0" cy="0" r="5.5" fill="${gold}" stroke="${stroke}" stroke-width="1.5"/>
        </g>
      </svg>`;

    case 'q': // Peony: 3-4 rotated rings of ruffled petals
      return `<svg viewBox="0 0 45 45" class="piece-svg piece-sway">
        <path d="M12 38 Q22.5 40 33 38 Q22.5 34 12 38 Z" fill="${stem}"/>
        <path d="M22.5 37 L22.5 26" stroke="${stem}" stroke-width="3" stroke-linecap="round"/>
        <g transform="translate(22.5, 18)">
          <!-- Outer ruffled petals -->
          ${[0, 60, 120, 180, 240, 300].map(deg => 
            `<path d="M-6 -10 C-4 -14 4 -14 6 -10 C8 -4 4 0 0 2 C-4 0 -8 -4 -6 -10 Z" fill="${fill}" stroke="${stroke}" stroke-width="1.3" transform="rotate(${deg})"/>`
          ).join('')}
          <!-- Inner ring petals -->
          ${[30, 90, 150, 210, 270, 330].map(deg => 
            `<path d="M-4 -7 C-2 -10 2 -10 4 -7 C5 -3 2 0 0 1 C-2 0 -5 -3 -4 -7 Z" fill="${isWhite ? '#ffd96b' : '#ffc4d6'}" stroke="${stroke}" stroke-width="1.1" transform="rotate(${deg})"/>`
          ).join('')}
          <circle cx="0" cy="0" r="3.5" fill="${gold}" stroke="${stroke}" stroke-width="1.2"/>
        </g>
      </svg>`;

    case 'k': // Dahlia: crown of short petals, golden stamen, dashed golden ID ring (#e2b23c)
      return `<svg viewBox="0 0 45 45" class="piece-svg piece-sway">
        <rect x="13" y="38" width="19" height="3" rx="1.5" fill="${stem}"/>
        <path d="M22.5 38 L22.5 24" stroke="${stem}" stroke-width="3.5" stroke-linecap="round"/>
        <g transform="translate(22.5, 17)">
          <!-- Dahlia Petal Crown -->
          ${[0, 24, 48, 72, 96, 120, 144, 168, 192, 216, 240, 264, 288, 312, 336].map(deg => 
            `<ellipse cx="0" cy="-10.5" rx="2.5" ry="5" fill="${fill}" stroke="${stroke}" stroke-width="1" transform="rotate(${deg})"/>`
          ).join('')}
          <circle cx="0" cy="0" r="5" fill="${gold}" stroke="${stroke}" stroke-width="1.5"/>
          <!-- Golden Cross Stamen -->
          <line x1="0" y1="-8" x2="0" y2="-1" stroke="#e2b23c" stroke-width="2"/>
          <line x1="-3" y1="-5" x2="3" y2="-5" stroke="#e2b23c" stroke-width="2"/>
          <!-- Dashed golden ID ring (#e2b23c) -->
          <circle cx="0" cy="0" r="14.5" fill="none" stroke="#e2b23c" stroke-width="1.8" stroke-dasharray="3.5 2.5"/>
        </g>
      </svg>`;
  }
}

// War Piece SVGs: Intergalactic War Machines (Cosmic Battle Tank, Assault Hover-Tank, Interceptor Gunship, Heavy Siege Tank, Dreadnought Battlecruiser, Command Titan)
function getWarSVG(type: PieceType, color: PieceColor, sq?: number): string {
  const isWhite = color === 'w';
  const hull = isWhite ? '#e4eaf3' : '#6a55c8';
  const outline = isWhite ? '#3c4a66' : '#cbbcff';
  const glow = isWhite ? '#19d3c5' : '#ff4f9a';
  const darkCore = '#1b1c4e';

  switch (type) {
    case 'p': // Cosmic Battle Tank: Heavy armored combat vehicle with dual plasma railgun barrels, reactive armor plates, rotating turret, and energetic crawler treads
      return `<svg viewBox="0 0 45 45" class="piece-svg war-tank-svg">
        <!-- Dual Plasma Exhaust Jets -->
        <polygon points="12,39 10,43 14,40" fill="${glow}"/>
        <polygon points="33,39 35,43 31,40" fill="${glow}"/>
        
        <!-- Heavy Armored Caterpillar Treads (Left & Right) -->
        <rect x="5" y="27" width="9" height="13" rx="2.5" fill="${darkCore}" stroke="${outline}" stroke-width="1.6"/>
        <rect x="31" y="27" width="9" height="13" rx="2.5" fill="${darkCore}" stroke="${outline}" stroke-width="1.6"/>
        <!-- Glowing Tread Energy Rollers -->
        <line x1="5" y1="31" x2="14" y2="31" stroke="${glow}" stroke-width="1.2"/>
        <line x1="5" y1="35" x2="14" y2="35" stroke="${glow}" stroke-width="1.2"/>
        <line x1="5" y1="39" x2="14" y2="39" stroke="${glow}" stroke-width="1.2"/>
        <line x1="31" y1="31" x2="40" y2="31" stroke="${glow}" stroke-width="1.2"/>
        <line x1="31" y1="35" x2="40" y2="35" stroke="${glow}" stroke-width="1.2"/>
        <line x1="31" y1="39" x2="40" y2="39" stroke="${glow}" stroke-width="1.2"/>

        <!-- Main Sloped Chassis Hull -->
        <polygon points="11,38 34,38 37,24 8,24" fill="${hull}" stroke="${outline}" stroke-width="2" stroke-linejoin="round"/>
        <!-- Front Reactive Armor Plate -->
        <polygon points="14,35 31,35 33,26 12,26" fill="${outline}" opacity="0.3"/>
        
        <!-- Rotating Armored Main Turret -->
        <polygon points="14,24 31,24 28,15 17,15" fill="${hull}" stroke="${outline}" stroke-width="1.8"/>
        
        <!-- Dual Heavy Plasma Railgun Barrels -->
        <rect x="18" y="5" width="3" height="12" fill="${darkCore}" stroke="${outline}" stroke-width="1.4"/>
        <rect x="24" y="5" width="3" height="12" fill="${darkCore}" stroke="${outline}" stroke-width="1.4"/>
        <!-- Muzzle Energy Emitters -->
        <circle cx="19.5" cy="5" r="1.8" fill="${glow}"/>
        <circle cx="25.5" cy="5" r="1.8" fill="${glow}"/>
        <line x1="18" y1="9" x2="21" y2="9" stroke="${glow}" stroke-width="1"/>
        <line x1="24" y1="9" x2="27" y2="9" stroke="${glow}" stroke-width="1"/>

        <!-- Center Cosmic Tachyon Reactor Core -->
        <circle cx="22.5" cy="19" r="3.2" fill="${glow}" stroke="${darkCore}" stroke-width="1.2"/>
        <circle cx="22.5" cy="19" r="1.2" fill="#ffffff"/>
        
        <!-- Laser Targeting Antenna -->
        <line x1="15" y1="15" x2="13" y2="9" stroke="${glow}" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="13" cy="9" r="1" fill="#ffffff"/>
      </svg>`;

    case 'n': // Assault Hover-Tank: armored combat tank with dual heavy rotating cannons & armored treads
      return `<svg viewBox="0 0 45 45" class="piece-svg">
        <!-- Heavy Armored Tread Chassis -->
        <rect x="7" y="32" width="10" height="9" rx="2" fill="${darkCore}" stroke="${outline}" stroke-width="1.5"/>
        <rect x="28" y="32" width="10" height="9" rx="2" fill="${darkCore}" stroke="${outline}" stroke-width="1.5"/>
        <rect x="9" y="34" width="6" height="5" fill="${glow}" opacity="0.8"/>
        <rect x="30" y="34" width="6" height="5" fill="${glow}" opacity="0.8"/>
        <!-- Tank Body Chassis -->
        <polygon points="11,33 34,33 37,25 8,25" fill="${hull}" stroke="${outline}" stroke-width="2"/>
        <!-- Rotating Armored Turret -->
        <polygon points="14,25 31,25 29,15 16,15" fill="${hull}" stroke="${outline}" stroke-width="1.8"/>
        <!-- Dual Heavy Main Tank Cannons -->
        <line x1="19" y1="17" x2="19" y2="5" stroke="${outline}" stroke-width="2.6" stroke-linecap="square"/>
        <line x1="26" y1="17" x2="26" y2="5" stroke="${outline}" stroke-width="2.6" stroke-linecap="square"/>
        <circle cx="19" cy="5" r="1.8" fill="${glow}"/>
        <circle cx="26" cy="5" r="1.8" fill="${glow}"/>
        <!-- Turret Commander Optics -->
        <circle cx="22.5" cy="20" r="2.8" fill="${glow}" stroke="${darkCore}" stroke-width="1"/>
      </svg>`;

    case 'b': // Interceptor Gunship: sleek swept-forward space interceptor with long-range spinal railgun
      return `<svg viewBox="0 0 45 45" class="piece-svg">
        <!-- Forward Railgun Accelerator Lance -->
        <line x1="22.5" y1="2" x2="22.5" y2="24" stroke="${glow}" stroke-width="2.8" stroke-linecap="round"/>
        <polygon points="21,5 24,5 23,16 22,16" fill="${outline}"/>
        <!-- Swept Forward High-Speed Wings -->
        <polygon points="22.5,12 36,22 41,34 32,32 26,26 19,26 13,32 4,34 9,22" fill="${hull}" stroke="${outline}" stroke-width="1.8" stroke-linejoin="round"/>
        <!-- Tail Twin Stabilizer Fins -->
        <polygon points="18,32 16,40 21,36" fill="${darkCore}" stroke="${outline}" stroke-width="1"/>
        <polygon points="27,32 29,40 24,36" fill="${darkCore}" stroke="${outline}" stroke-width="1"/>
        <!-- Cockpit Targeting Visor -->
        <polygon points="22.5,18 25,24 22.5,27 20,24" fill="${glow}" stroke="${darkCore}" stroke-width="1"/>
      </svg>`;

    case 'r': // Heavy Siege Tank: massive orbital fortress tank with dual siege mortars & front ram plow
      return `<svg viewBox="0 0 45 45" class="piece-svg">
        <!-- Heavy Quad Track Pods -->
        <rect x="6" y="28" width="10" height="13" rx="2" fill="${darkCore}" stroke="${outline}" stroke-width="1.8"/>
        <rect x="29" y="28" width="10" height="13" rx="2" fill="${darkCore}" stroke="${outline}" stroke-width="1.8"/>
        <line x1="6" y1="35" x2="16" y2="35" stroke="${glow}" stroke-width="1.5"/>
        <line x1="29" y1="35" x2="39" y2="35" stroke="${glow}" stroke-width="1.5"/>
        <!-- Reinforced Bumper Plow & Lower Hull -->
        <polygon points="10,38 35,38 37,28 8,28" fill="${hull}" stroke="${outline}" stroke-width="2"/>
        <!-- Heavy Fortress Bunker Structure -->
        <polygon points="12,28 33,28 31,16 14,16" fill="${hull}" stroke="${outline}" stroke-width="2"/>
        <!-- Massive Twin Siege Railgun Barrels -->
        <rect x="17" y="6" width="4" height="14" fill="${darkCore}" stroke="${outline}" stroke-width="1.5"/>
        <rect x="24" y="6" width="4" height="14" fill="${darkCore}" stroke="${outline}" stroke-width="1.5"/>
        <circle cx="19" cy="6" r="1.8" fill="${glow}"/>
        <circle cx="26" cy="6" r="1.8" fill="${glow}"/>
        <!-- Shield Emitter Core -->
        <rect x="19" y="22" width="7" height="4" rx="1" fill="${glow}"/>
      </svg>`;

    case 'q': // Dreadnought Battlecruiser: galactic flagship warship with launch bays, broadside turrets & heavy prow
      return `<svg viewBox="0 0 45 45" class="piece-svg">
        <!-- Heavy Arrowhead Battleship Hull -->
        <polygon points="22.5,5 37,22 40,36 30,34 26,38 19,38 15,34 5,36 8,22" fill="${hull}" stroke="${outline}" stroke-width="2" stroke-linejoin="round"/>
        <!-- Broadside Fighter Hangars -->
        <rect x="10" y="26" width="5" height="4" fill="${glow}"/>
        <rect x="30" y="26" width="5" height="4" fill="${glow}"/>
        <!-- Center Armor Ridge & Spine -->
        <polygon points="22.5,8 27,24 22.5,34 18,24" fill="${outline}" opacity="0.5"/>
        <!-- Command Bridge Tower -->
        <polygon points="20,18 25,18 24,11 21,11" fill="${hull}" stroke="${outline}" stroke-width="1.5"/>
        <rect x="21" y="13" width="3" height="2" fill="${glow}"/>
        <!-- Main Tachyon Core Eye -->
        <circle cx="22.5" cy="27" r="3.2" fill="${glow}" stroke="${darkCore}" stroke-width="1.2"/>
        <!-- Dual Warp Engine Nacelles -->
        <line x1="20" y1="38" x2="20" y2="42" stroke="${glow}" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="25" y1="38" x2="25" y2="42" stroke="${glow}" stroke-width="2.5" stroke-linecap="round"/>
      </svg>`;

    case 'k': // Command Titan: the supreme armada mothership with command citadel, orbital lance & target reticle
      return `<svg viewBox="0 0 45 45" class="piece-svg">
        <!-- Heavy Mothership Superstructure -->
        <polygon points="22.5,8 35,18 38,36 31,38 27,33 18,33 14,38 7,36 10,18" fill="${hull}" stroke="${outline}" stroke-width="2" stroke-linejoin="round"/>
        <!-- Defense Drone Winglets -->
        <polygon points="6,24 2,28 7,32" fill="${glow}" stroke="${darkCore}" stroke-width="1"/>
        <polygon points="39,24 43,28 38,32" fill="${glow}" stroke="${darkCore}" stroke-width="1"/>
        <!-- Central Command Citadel -->
        <polygon points="19,16 26,16 28,26 17,26" fill="${outline}" opacity="0.6"/>
        <!-- High-Output Pulsating Reactor Matrix -->
        <circle cx="22.5" cy="24" r="4.5" fill="${glow}" stroke="${darkCore}" stroke-width="1.4"/>
        <circle cx="22.5" cy="24" r="2" fill="#ffffff"/>
        <!-- Spinal Orbital Lance Emitter -->
        <line x1="22.5" y1="2" x2="22.5" y2="8" stroke="${glow}" stroke-width="2.6" stroke-linecap="round"/>
        <!-- Rotating Target Lock ID Perimeter Ring -->
        <circle cx="22.5" cy="24" r="14.5" fill="none" stroke="${glow}" stroke-width="1.6" stroke-dasharray="4 2.5"/>
      </svg>`;
  }
}

// Beast Piece SVGs: Primal Wild Predators (Dire Wolf, Shadow Panther, Apex Falcon, Silverback Gorilla, Savage Tigress, Apex Lion King)
function getBeastSVG(type: PieceType, color: PieceColor, sq?: number): string {
  const isWhite = color === 'w';
  const fur = isWhite ? '#f59e0b' : '#312e81';
  const darkFur = isWhite ? '#78350f' : '#0f172a';
  const highlight = isWhite ? '#fef3c7' : '#4338ca';
  const eyes = isWhite ? '#10b981' : '#f43f5e';
  const claws = isWhite ? '#ffffff' : '#e2e8f0';
  const accent = isWhite ? '#f97316' : '#ec4899';

  switch (type) {
    case 'p': // Dire Wolf: Snarling pack predator with pointed ears, razor fangs & clawed paw
      return `<svg viewBox="0 0 45 45" class="piece-svg beast-wolf-svg">
        <!-- Wolf Bristling Neck & Mane Fur -->
        <polygon points="12,41 22.5,33 33,41 37,29 32,23 22.5,27 13,23 8,29" fill="${fur}" stroke="${darkFur}" stroke-width="1.8" stroke-linejoin="round"/>
        <polygon points="17,39 22.5,33 28,39" fill="${highlight}" opacity="0.6"/>
        
        <!-- Wolf Head & Snout -->
        <polygon points="22.5,10 32,19 30,27 22.5,32 15,27 13,19" fill="${fur}" stroke="${darkFur}" stroke-width="2" stroke-linejoin="round"/>
        
        <!-- Alert Pointed Ears -->
        <polygon points="14,19 10,7 18,13" fill="${fur}" stroke="${darkFur}" stroke-width="1.6"/>
        <polygon points="12,16 11,9 15,13" fill="${darkFur}"/>
        <polygon points="31,19 35,7 27,13" fill="${fur}" stroke="${darkFur}" stroke-width="1.6"/>
        <polygon points="33,16 34,9 30,13" fill="${darkFur}"/>

        <!-- Piercing Predatory Eyes -->
        <polygon points="17,19 20,18 18,21" fill="${eyes}"/>
        <polygon points="28,19 25,18 27,21" fill="${eyes}"/>

        <!-- Snout Nose & Whisker Plate -->
        <polygon points="22.5,23 25,27 20,27" fill="${darkFur}"/>

        <!-- Bared Razor Fangs -->
        <polygon points="19,27 20,31 21,27" fill="${claws}"/>
        <polygon points="24,27 25,31 26,27" fill="${claws}"/>

        <!-- 3 Curved Front Claws on Base -->
        <line x1="16" y1="41" x2="14" y2="44" stroke="${claws}" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="22.5" y1="41" x2="22.5" y2="44" stroke="${claws}" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="29" y1="41" x2="31" y2="44" stroke="${claws}" stroke-width="2.2" stroke-linecap="round"/>
      </svg>`;

    case 'n': // Shadow Panther / Leopard: Agile leaping feline predator with sleek head & curved razor claws
      return `<svg viewBox="0 0 45 45" class="piece-svg beast-panther-svg">
        <!-- Arched Muscular Prowling Body & Whipping Tail -->
        <path d="M10 39 Q7 26 15 22 Q21 20 25 14 Q29 20 33 26 Q36 34 35 40 Q28 35 22.5 37 Q17 35 10 39 Z" fill="${fur}" stroke="${darkFur}" stroke-width="2" stroke-linejoin="round"/>
        <!-- Whipping Tail Curve -->
        <path d="M35 38 Q42 34 40 24 Q38 20 35 22" fill="none" stroke="${fur}" stroke-width="2.8" stroke-linecap="round"/>

        <!-- Panther Head -->
        <ellipse cx="21" cy="15" rx="8" ry="7" fill="${fur}" stroke="${darkFur}" stroke-width="1.8"/>
        <!-- Rounded Feline Ears -->
        <circle cx="15" cy="9" r="3.2" fill="${fur}" stroke="${darkFur}" stroke-width="1.4"/>
        <circle cx="27" cy="9" r="3.2" fill="${fur}" stroke="${darkFur}" stroke-width="1.4"/>
        <circle cx="15" cy="9" r="1.5" fill="${darkFur}"/>
        <circle cx="27" cy="9" r="1.5" fill="${darkFur}"/>

        <!-- Glowing Feline Eyes -->
        <ellipse cx="18" cy="14" rx="2.2" ry="1.4" fill="${eyes}" transform="rotate(-10, 18, 14)"/>
        <ellipse cx="24" cy="14" rx="2.2" ry="1.4" fill="${eyes}" transform="rotate(10, 24, 14)"/>

        <!-- Snarl Muzzle & Teeth -->
        <path d="M19 17 Q21 19 23 17 L21 21 Z" fill="${darkFur}"/>
        <polygon points="18,19 19,23 20,19" fill="${claws}"/>
        <polygon points="22,19 23,23 24,19" fill="${claws}"/>

        <!-- Extended Deadly Front Paws & Claws -->
        <g transform="translate(10, 36)">
          <line x1="0" y1="0" x2="-3" y2="4" stroke="${claws}" stroke-width="2.2" stroke-linecap="round"/>
          <line x1="3" y1="0" x2="3" y2="5" stroke="${claws}" stroke-width="2.2" stroke-linecap="round"/>
          <line x1="6" y1="0" x2="9" y2="4" stroke="${claws}" stroke-width="2.2" stroke-linecap="round"/>
        </g>
        <!-- Claw Slash Spark -->
        <line x1="28" y1="29" x2="33" y2="34" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
      </svg>`;

    case 'b': // Apex Falcon / Hawk: Savage bird of prey with razor spreading wings & clutching talons
      return `<svg viewBox="0 0 45 45" class="piece-svg beast-falcon-svg">
        <!-- Spreading Razor-Feather Wings -->
        <path d="M22.5 16 L6 10 L10 24 L16 28 L22.5 24 L29 28 L35 24 L39 10 Z" fill="${fur}" stroke="${darkFur}" stroke-width="1.8" stroke-linejoin="round"/>
        <!-- Wing Feather Serrations -->
        <polygon points="6,10 11,15 10,20 16,19 15,24" fill="${darkFur}" opacity="0.4"/>
        <polygon points="39,10 34,15 35,20 29,19 30,24" fill="${darkFur}" opacity="0.4"/>

        <!-- Falcon Body & Fierce Chest -->
        <polygon points="18,22 27,22 29,36 22.5,40 16,36" fill="${fur}" stroke="${darkFur}" stroke-width="1.8"/>
        <polygon points="20,24 25,24 22.5,35" fill="${highlight}" opacity="0.7"/>

        <!-- Raptor Head -->
        <polygon points="22.5,5 28,12 26,19 19,19 17,12" fill="${fur}" stroke="${darkFur}" stroke-width="1.8"/>
        <!-- Sharp Hooked Tearing Beak -->
        <path d="M22.5 13 Q27 15 26 21 Q24 20 22.5 18" fill="${claws}" stroke="${darkFur}" stroke-width="1.4"/>
        
        <!-- Piercing Golden Hunting Eye -->
        <circle cx="20" cy="11" r="2.2" fill="${eyes}"/>
        <circle cx="20" cy="11" r="1" fill="#000000"/>

        <!-- Clutching Razor Talons (Curved Claws) -->
        <path d="M17 38 Q14 43 12 42" stroke="${claws}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M19 38 Q19 44 17 44" stroke="${claws}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M26 38 Q26 44 28 44" stroke="${claws}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M28 38 Q31 43 33 42" stroke="${claws}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      </svg>`;

    case 'r': // Silverback Gorilla / Crushing Beast: Heavyweight colossus with massive punching arms
      return `<svg viewBox="0 0 45 45" class="piece-svg beast-gorilla-svg">
        <!-- Massive Armored Shoulders & Trapezius -->
        <path d="M7 38 L9 20 L15 16 L22.5 18 L30 16 L36 20 L38 38 Q22.5 44 7 38 Z" fill="${fur}" stroke="${darkFur}" stroke-width="2" stroke-linejoin="round"/>
        <!-- Silverback Crest & Broad Chest Plate -->
        <polygon points="16,21 29,21 27,33 18,33" fill="${highlight}" opacity="0.45" stroke="${darkFur}" stroke-width="1.4"/>
        <line x1="22.5" y1="21" x2="22.5" y2="33" stroke="${darkFur}" stroke-width="1.4"/>

        <!-- Heavy Crested Gorilla Brow & Head -->
        <polygon points="17,8 28,8 30,17 22.5,21 15,17" fill="${darkFur}" stroke="${darkFur}" stroke-width="1.8"/>
        <!-- Prominent Sagittal Skull Crest -->
        <polygon points="20,8 25,8 24,4 21,4" fill="${fur}" stroke="${darkFur}" stroke-width="1.2"/>

        <!-- Fiery Enraged Eyes -->
        <circle cx="19" cy="13" r="1.8" fill="${eyes}"/>
        <circle cx="26" cy="13" r="1.8" fill="${eyes}"/>

        <!-- Bared Heavy Teeth -->
        <rect x="19" y="16" width="7" height="3" rx="1" fill="${claws}" stroke="${darkFur}" stroke-width="1"/>

        <!-- Colossal Punching Fist Knuckles & Claws -->
        <rect x="5" y="32" width="9" height="10" rx="3" fill="${darkFur}" stroke="${fur}" stroke-width="1.6"/>
        <rect x="31" y="32" width="9" height="10" rx="3" fill="${darkFur}" stroke="${fur}" stroke-width="1.6"/>
        <line x1="7" y1="41" x2="12" y2="41" stroke="${claws}" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="33" y1="41" x2="38" y2="41" stroke="${claws}" stroke-width="2.5" stroke-linecap="round"/>
      </svg>`;

    case 'q': // Savage Tigress: Deadly feline queen with predator stripes, razor claw crowns & saber fangs
      return `<svg viewBox="0 0 45 45" class="piece-svg beast-tigress-svg">
        <!-- Graceful Muscular Body -->
        <path d="M12 41 Q9 26 17 20 Q22.5 17 28 20 Q36 26 33 41 Q22.5 37 12 41 Z" fill="${fur}" stroke="${darkFur}" stroke-width="2"/>
        
        <!-- Savage Tiger Stripes -->
        <path d="M13 28 L19 27 M12 34 L18 33 M32 28 L26 27 M33 34 L27 33" stroke="${darkFur}" stroke-width="2.2" stroke-linecap="round"/>

        <!-- Tigress Head -->
        <polygon points="22.5,9 31,18 29,26 22.5,30 16,26 14,18" fill="${fur}" stroke="${darkFur}" stroke-width="1.8"/>
        <!-- Sleek Pointed Tiger Ears -->
        <polygon points="14,17 10,8 18,12" fill="${fur}" stroke="${darkFur}" stroke-width="1.5"/>
        <polygon points="31,17 35,8 27,12" fill="${fur}" stroke="${darkFur}" stroke-width="1.5"/>

        <!-- Queen's Crown of Fang Crests -->
        <polygon points="18,9 20,4 22,9" fill="${claws}" stroke="${darkFur}" stroke-width="1"/>
        <polygon points="21.5,9 22.5,2 23.5,9" fill="${accent}" stroke="${darkFur}" stroke-width="1"/>
        <polygon points="23,9 25,4 27,9" fill="${claws}" stroke="${darkFur}" stroke-width="1"/>

        <!-- Piercing Deadly Eyes -->
        <polygon points="17,17 20,16 19,19" fill="${eyes}"/>
        <polygon points="28,17 25,16 26,19" fill="${eyes}"/>

        <!-- Dagger Canines & Snarl -->
        <path d="M19 22 Q22.5 24 26 22" stroke="${darkFur}" stroke-width="1.5" fill="none"/>
        <polygon points="18,22 19,27 20,22" fill="${claws}"/>
        <polygon points="25,22 26,27 27,22" fill="${claws}"/>

        <!-- 4 Extended Razor Claws -->
        <g transform="translate(15, 38)">
          <line x1="0" y1="0" x2="-2" y2="4" stroke="${claws}" stroke-width="2.2" stroke-linecap="round"/>
          <line x1="5" y1="0" x2="5" y2="5" stroke="${claws}" stroke-width="2.2" stroke-linecap="round"/>
          <line x1="10" y1="0" x2="10" y2="5" stroke="${claws}" stroke-width="2.2" stroke-linecap="round"/>
          <line x1="15" y1="0" x2="17" y2="4" stroke="${claws}" stroke-width="2.2" stroke-linecap="round"/>
        </g>
      </svg>`;

    case 'k': // The Apex Lion King: Majestic mane with radial claw-tufts, horns & roar crown
      return `<svg viewBox="0 0 45 45" class="piece-svg beast-lion-svg">
        <!-- Massive Flowing Radial Lion Mane -->
        <g transform="translate(22.5, 20)">
          ${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg =>
            `<path d="M0 -18 C3 -14 3 -8 0 0 C-3 -8 -3 -14 0 -18 Z" fill="${darkFur}" stroke="${fur}" stroke-width="1.2" transform="rotate(${deg})"/>`
          ).join('')}
        </g>

        <!-- Lion Head Chassis -->
        <polygon points="22.5,10 30,18 29,27 22.5,31 16,27 15,18" fill="${fur}" stroke="${darkFur}" stroke-width="2"/>
        <!-- Golden Chest Beard -->
        <polygon points="17,29 22.5,39 28,29" fill="${highlight}" stroke="${darkFur}" stroke-width="1.6"/>

        <!-- Sovereign Beast Horns / Fang Crown -->
        <path d="M15 10 Q11 3 8 5 Q11 8 16 11" fill="${accent}" stroke="${darkFur}" stroke-width="1.2"/>
        <path d="M30 10 Q34 3 37 5 Q34 8 29 11" fill="${accent}" stroke="${darkFur}" stroke-width="1.2"/>
        <circle cx="22.5" cy="5" r="3.2" fill="${accent}" stroke="${claws}" stroke-width="1.2"/>

        <!-- Sovereign Lion Eyes -->
        <circle cx="18.5" cy="17" r="2.2" fill="${eyes}"/>
        <circle cx="26.5" cy="17" r="2.2" fill="${eyes}"/>
        <circle cx="18.5" cy="17" r="1" fill="#000000"/>
        <circle cx="26.5" cy="17" r="1" fill="#000000"/>

        <!-- Mighty Muzzle & Bared Royal Fangs -->
        <ellipse cx="22.5" cy="23" rx="4.5" ry="3.5" fill="${darkFur}"/>
        <polygon points="18,24 19,29 20.5,24" fill="${claws}"/>
        <polygon points="24.5,24 26,29 27,24" fill="${claws}"/>

        <!-- Royal Claw Perimeter Aura Ring -->
        <circle cx="22.5" cy="20" r="16.5" fill="none" stroke="${accent}" stroke-width="1.6" stroke-dasharray="3 3"/>
      </svg>`;
  }
}

// Greek Mythology Gods: Hoplite (Pawn), Pegasus (Knight), Apollo (Bishop), Poseidon (Rook), Athena (Queen), Zeus (King)
function getGreekSVG(type: PieceType, color: PieceColor, sq?: number): string {
  const isWhite = color === 'w';
  // Golden Ivory & Celestial Gold vs Royal Tyrian Purple & Aegean Deep Gold
  const gold = isWhite ? '#facc15' : '#eab308';
  const lightGold = isWhite ? '#fef08a' : '#fde047';
  const bronze = isWhite ? '#b45309' : '#78350f';
  const body = isWhite ? '#faf8f0' : '#2e1065';
  const stroke = isWhite ? '#854d0e' : '#1e1b4b';
  const crest = isWhite ? '#ef4444' : '#a855f7';
  const eye = isWhite ? '#38bdf8' : '#f43f5e';
  const electric = '#00f2fe';

  switch (type) {
    case 'p': // Spartan Hoplite / Myrmidon: Corinthian helmet, round Aspis shield with Greek Lambda / lightning bolt, dory spear
      return `<svg viewBox="0 0 45 45" class="piece-svg greek-piece greek-hoplite-svg">
        <!-- Hoplite Corinthian Crest (Red/Purple flowing horsehair) -->
        <path d="M16 14 C16 4 29 4 29 14" fill="${crest}" stroke="${stroke}" stroke-width="1.4"/>
        <path d="M22.5 3 Q29 6 31 16" stroke="${lightGold}" stroke-width="1.8" fill="none"/>
        <!-- Corinthian Bronze Helmet Faceguard -->
        <path d="M16 14 C16 10 29 10 29 14 L29 25 L24 25 L24 20 L21 20 L21 25 L16 25 Z" fill="${bronze}" stroke="${stroke}" stroke-width="1.6"/>
        <!-- Eye Slits -->
        <polygon points="18,17 21,17 20,19" fill="${eye}"/>
        <polygon points="24,17 27,17 25,19" fill="${eye}"/>
        <!-- Round Greek Aspis Shield -->
        <circle cx="22.5" cy="33" r="10.5" fill="${body}" stroke="${gold}" stroke-width="2"/>
        <circle cx="22.5" cy="33" r="8" fill="none" stroke="${bronze}" stroke-width="1" stroke-dasharray="2 2"/>
        <!-- Golden Greek Lambda (Λ) & Lightning Insignia -->
        <path d="M18.5 37 L22.5 28 L26.5 37" fill="none" stroke="${gold}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- Dory Spear Tip in Hand -->
        <line x1="33" y1="12" x2="33" y2="42" stroke="${bronze}" stroke-width="2" stroke-linecap="round"/>
        <polygon points="33,6 35,12 31,12" fill="${lightGold}" stroke="${stroke}" stroke-width="1"/>
      </svg>`;

    case 'n': // Pegasus: Winged Divine Celestial Steed of Olympus
      return `<svg viewBox="0 0 45 45" class="piece-svg greek-piece greek-pegasus-svg">
        <!-- Celestial Starry Wing Left -->
        <path d="M17 22 C10 14 5 8 1 12 C1 18 10 26 17 27 Z" fill="${body}" stroke="${gold}" stroke-width="1.5"/>
        <path d="M4 14 Q10 18 16 24" stroke="${gold}" stroke-width="1.2" fill="none"/>
        <path d="M7 11 Q12 16 17 21" stroke="${gold}" stroke-width="1.2" fill="none"/>
        <!-- Celestial Starry Wing Right (Majestic spread) -->
        <path d="M28 22 C35 14 40 8 44 12 C44 18 35 26 28 27 Z" fill="${body}" stroke="${gold}" stroke-width="1.5"/>
        <path d="M41 14 Q35 18 29 24" stroke="${gold}" stroke-width="1.2" fill="none"/>
        <path d="M38 11 Q33 16 28 21" stroke="${gold}" stroke-width="1.2" fill="none"/>
        <!-- Pegasus Stallion Rearing Torso & Chest -->
        <path d="M16 41 L29 41 L26 27 L19 27 Z" fill="${body}" stroke="${stroke}" stroke-width="1.8"/>
        <!-- Pegasus Noble Steed Head -->
        <path d="M18 27 L17 18 Q16 11 22.5 8 Q27 11 26 16 L28 21 L24 25 Z" fill="${body}" stroke="${stroke}" stroke-width="1.8"/>
        <!-- Muzzle & Nostril -->
        <ellipse cx="23" cy="9" rx="3.5" ry="2.5" fill="${bronze}"/>
        <!-- Divine Eye -->
        <circle cx="21" cy="14" r="2" fill="${eye}"/>
        <circle cx="21" cy="14" r="0.8" fill="#ffffff"/>
        <!-- Golden Flowing Mane & Forelock -->
        <path d="M19 8 Q17 4 19 2 Q22 5 21 8" fill="${gold}" stroke="${stroke}" stroke-width="1"/>
        <path d="M22 10 Q25 6 27 7 Q26 11 24 12" fill="${gold}" stroke="${stroke}" stroke-width="1"/>
        <!-- Golden Hoof Stamp -->
        <polygon points="17,39 20,38 21,41 17,41" fill="${gold}"/>
        <polygon points="28,39 25,38 24,41 28,41" fill="${gold}"/>
      </svg>`;

    case 'b': // Apollo: God of the Sun, Music, Light & Prophecy
      return `<svg viewBox="0 0 45 45" class="piece-svg greek-piece greek-apollo-svg">
        <!-- Radiant Apollo Sunburst Corona (8 Golden Sun Rays) -->
        <g transform="translate(22.5, 16)">
          ${[0, 45, 90, 135, 180, 225, 270, 315].map(deg =>
            `<line x1="0" y1="-10" x2="0" y2="-16" stroke="${gold}" stroke-width="2.2" stroke-linecap="round" transform="rotate(${deg})"/>`
          ).join('')}
        </g>
        <!-- Divine Halo Disk -->
        <circle cx="22.5" cy="16" r="9.5" fill="rgba(250, 204, 21, 0.25)" stroke="${gold}" stroke-width="1.5"/>
        <!-- Apollo's Golden Laurel Wreath -->
        <circle cx="22.5" cy="16" r="7.2" fill="${body}" stroke="${bronze}" stroke-width="1.6"/>
        <circle cx="22.5" cy="16" r="4.2" fill="${lightGold}"/>
        <!-- Apollo Head & Godly Visage -->
        <circle cx="22.5" cy="16" r="2" fill="${stroke}"/>
        <!-- Golden Lyre of Apollo (Kithara) on Torso -->
        <path d="M15 40 L30 40 L28 27 L17 27 Z" fill="${body}" stroke="${stroke}" stroke-width="1.8"/>
        <!-- Lyre Horns -->
        <path d="M18 38 Q15 28 17 24 Q19 24 19 28" fill="none" stroke="${gold}" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M27 38 Q30 28 28 24 Q26 24 26 28" fill="none" stroke="${gold}" stroke-width="2.2" stroke-linecap="round"/>
        <!-- Lyre Crossbar & Strings -->
        <line x1="17" y1="25" x2="28" y2="25" stroke="${gold}" stroke-width="2.4"/>
        <line x1="21" y1="25" x2="21" y2="36" stroke="${lightGold}" stroke-width="1.2"/>
        <line x1="22.5" y1="25" x2="22.5" y2="36" stroke="${lightGold}" stroke-width="1.2"/>
        <line x1="24" y1="25" x2="24" y2="36" stroke="${lightGold}" stroke-width="1.2"/>
      </svg>`;

    case 'r': // Poseidon: Earth-Shaker, King of the Oceans, Trident Fortress
      return `<svg viewBox="0 0 45 45" class="piece-svg greek-piece greek-poseidon-svg">
        <!-- Crashing Tidal Wave Spirals Base -->
        <path d="M10 40 Q16 35 22.5 40 Q29 35 35 40 L34 42 L11 42 Z" fill="#0284c7" stroke="${stroke}" stroke-width="1.4"/>
        <path d="M8 38 C14 34 16 37 22.5 35 C29 37 31 34 37 38" fill="none" stroke="#38bdf8" stroke-width="1.8"/>
        <!-- Sea Citadel Fortress Pedestal -->
        <path d="M13 38 L32 38 L29 22 L16 22 Z" fill="${body}" stroke="${stroke}" stroke-width="1.8"/>
        <!-- Citadel Battlement Bastions -->
        <polygon points="14,22 17,22 17,17 19,17 19,22 26,22 26,17 28,17 28,22 31,22 30,15 15,15" fill="${bronze}" stroke="${stroke}" stroke-width="1.4"/>
        <!-- Colossal Golden Three-Pronged Trident (Trisula Samudera) -->
        <line x1="22.5" y1="36" x2="22.5" y2="4" stroke="${gold}" stroke-width="2.6" stroke-linecap="round"/>
        <!-- Center Spear Blade -->
        <polygon points="22.5,2 24.5,9 20.5,9" fill="${lightGold}" stroke="${gold}" stroke-width="1"/>
        <!-- Left Prong Curve -->
        <path d="M22.5 12 Q14 12 15 5 Q17 5 17 9 Q20 10 22.5 10" fill="${lightGold}" stroke="${gold}" stroke-width="1.2"/>
        <!-- Right Prong Curve -->
        <path d="M22.5 12 Q31 12 30 5 Q28 5 28 9 Q25 10 22.5 10" fill="${lightGold}" stroke="${gold}" stroke-width="1.2"/>
        <!-- Glowing Ocean Pearl Gem in Center -->
        <circle cx="22.5" cy="13" r="2.8" fill="#38bdf8" stroke="#ffffff" stroke-width="1"/>
        <circle cx="22.5" cy="13" r="1.2" fill="#ffffff"/>
      </svg>`;

    case 'q': // Athena: Goddess of Wisdom, Strategic Warfare & Sovereign Justice
      return `<svg viewBox="0 0 45 45" class="piece-svg greek-piece greek-athena-svg">
        <!-- Athena Majestic Corinthian Transverse Helmet Crest -->
        <path d="M14 12 C14 2 31 2 31 12" fill="${crest}" stroke="${stroke}" stroke-width="1.6"/>
        <path d="M22.5 2 Q29 5 32 14" stroke="${gold}" stroke-width="2" fill="none"/>
        <!-- Corinthian High Visor & Temple Guard -->
        <polygon points="17,12 28,12 27,22 22.5,25 18,22" fill="${gold}" stroke="${stroke}" stroke-width="1.8"/>
        <!-- Divine Eyes of Wisdom -->
        <ellipse cx="20" cy="17" rx="1.8" ry="2.2" fill="${eye}"/>
        <ellipse cx="25" cy="17" rx="1.8" ry="2.2" fill="${eye}"/>
        <!-- Sacred Aegis Breastplate & Robe -->
        <path d="M14 41 L31 41 L27 25 L18 25 Z" fill="${body}" stroke="${stroke}" stroke-width="1.8"/>
        <!-- Gorgoneion / Owl of Wisdom Emblem on Breastplate -->
        <circle cx="22.5" cy="32" r="5.5" fill="${bronze}" stroke="${gold}" stroke-width="1.4"/>
        <!-- Owl Eyes on Aegis -->
        <circle cx="20.5" cy="31" r="1.6" fill="${lightGold}"/>
        <circle cx="24.5" cy="31" r="1.6" fill="${lightGold}"/>
        <polygon points="22.5,33 21.5,35 23.5,35" fill="${gold}"/>
        <!-- Athena's Divine Spear of Victory -->
        <line x1="34" y1="8" x2="34" y2="42" stroke="${gold}" stroke-width="2.2" stroke-linecap="round"/>
        <polygon points="34,2 36.5,8 31.5,8" fill="${lightGold}" stroke="${gold}" stroke-width="1.2"/>
        <!-- Olive Branch of Peace & Wisdom -->
        <path d="M11 26 Q9 32 11 38" stroke="${gold}" stroke-width="1.8" fill="none"/>
        <circle cx="9.5" cy="28" r="1.4" fill="#84cc16"/>
        <circle cx="8.5" cy="33" r="1.4" fill="#84cc16"/>
        <circle cx="10" cy="37" r="1.4" fill="#84cc16"/>
      </svg>`;

    case 'k': // Zeus Almighty: King of Mount Olympus, Lord of Thunder & Skies
      return `<svg viewBox="0 0 45 45" class="piece-svg greek-piece greek-zeus-svg">
        <!-- Sovereign Eagle of Zeus (Aetos Dios) Crest atop Crown -->
        <polygon points="22.5,2 25,6 27,4 25,9 22.5,7 20,9 18,4 20,6" fill="${gold}" stroke="${stroke}" stroke-width="1"/>
        <!-- Master Thunder Lightning Halo Perimeter (Electric Shockwave Ring) -->
        <circle cx="22.5" cy="19" r="17" fill="none" stroke="${gold}" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.85" class="lock-ring-spin"/>
        <!-- Zeus Royal Golden Oak Crown -->
        <path d="M16 11 Q22.5 8 29 11 L28 17 L17 17 Z" fill="${gold}" stroke="${stroke}" stroke-width="1.6"/>
        <circle cx="22.5" cy="13" r="2.2" fill="${electric}" stroke="#ffffff" stroke-width="1"/>
        <!-- Zeus Olympian Bearded Face & Sovereign Brow -->
        <polygon points="18,17 27,17 26,26 22.5,30 19,26" fill="${body}" stroke="${stroke}" stroke-width="1.8"/>
        <!-- Flowing Sovereign White/Golden Beard -->
        <path d="M17 23 Q22.5 35 28 23 Q25 33 22.5 33 Q20 33 17 23 Z" fill="${isWhite ? '#ffffff' : '#d4d4d8'}" stroke="${stroke}" stroke-width="1.4"/>
        <!-- Piercing Divine Lightning Eyes -->
        <circle cx="20" cy="20" r="1.8" fill="${electric}"/>
        <circle cx="25" cy="20" r="1.8" fill="${electric}"/>
        <circle cx="20" cy="20" r="0.8" fill="#ffffff"/>
        <circle cx="25" cy="20" r="0.8" fill="#ffffff"/>
        <!-- Zeus Regal Mantle Robe -->
        <path d="M12 41 L33 41 L29 28 L16 28 Z" fill="${bronze}" stroke="${stroke}" stroke-width="1.8"/>
        <polygon points="17,30 22.5,41 28,30" fill="${gold}" opacity="0.8"/>
        <!-- Crackling Master Thunderbolt (Keraunos) in Hand -->
        <g transform="translate(34, 18)">
          <polygon points="0,-12 3,-2 0,-3 4,10 -1,2 2,1 -3,-10" fill="${electric}" stroke="${lightGold}" stroke-width="1.2"/>
          <circle cx="1" cy="0" r="2.5" fill="#ffffff"/>
        </g>
      </svg>`;
  }
}

export function getPieceSVG(type: PieceType, color: PieceColor, theme: ThemeType, sq?: number): string {
  if (theme === 'flower') return getFlowerSVG(type, color, sq);
  if (theme === 'beast') return getBeastSVG(type, color, sq);
  if (theme === 'greek') return getGreekSVG(type, color, sq);
  return getWarSVG(type, color, sq);
}

export function getExtraPionSVG(color: PieceColor, theme: ThemeType, patternId: string = 'ember_vanguard'): string {
  const isWhite = color === 'w';
  
  // Custom unique Extra Pion designs by pattern
  if (patternId === 'primal_claw') {
    // Beast Primal Razor-Claw Pion: Feral Sabertooth Crest + Amber Glowing Core + Curved Talons
    const fur = isWhite ? '#fef08a' : '#78350f';
    const darkFur = isWhite ? '#b45309' : '#1c1917';
    const amber = '#f59e0b';
    return `<svg viewBox="0 0 45 45" class="piece-svg extra-pion-svg beast-extra-pion">
      <defs>
        <radialGradient id="clawGlow-${color}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#b45309" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <!-- Aura Glow -->
      <circle cx="22.5" cy="22.5" r="20" fill="url(#clawGlow-${color})" class="extra-pion-pulse"/>
      <!-- Feral Beast Body Base -->
      <path d="M12 40 L33 40 L28 26 L17 26 Z" fill="${darkFur}" stroke="${fur}" stroke-width="1.8"/>
      <!-- Sabertooth Head & Snarl -->
      <polygon points="22.5,7 31,18 29,27 22.5,31 16,27 14,18" fill="${fur}" stroke="${darkFur}" stroke-width="2"/>
      <!-- Glowing Amber Beast Eyes -->
      <polygon points="18,17 20,16 19,19" fill="#ef4444"/>
      <polygon points="27,17 25,16 26,19" fill="#ef4444"/>
      <!-- Triple Razor Claw Crest on Crown -->
      <g transform="translate(22.5, 6)">
        <line x1="-6" y1="2" x2="-8" y2="-4" stroke="${amber}" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="0" y1="0" x2="0" y2="-6" stroke="${amber}" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="6" y1="2" x2="8" y2="-4" stroke="${amber}" stroke-width="2.2" stroke-linecap="round"/>
      </g>
      <!-- Core Claw Runestone -->
      <circle cx="22.5" cy="24" r="3.2" fill="#ef4444" stroke="#ffffff" stroke-width="1"/>
      <circle cx="22.5" cy="24" r="1.5" fill="#fef08a"/>
    </svg>`;
  } else if (patternId === 'hyper_warp') {
    // Cosmic Hyper-Warp Mech Pion: Gyro rings + Laser core + Orbital Chevrons
    const metal = isWhite ? '#e2e8f0' : '#1e293b';
    const cyan = '#06b6d4';
    const border = isWhite ? '#0284c7' : '#0f172a';
    return `<svg viewBox="0 0 45 45" class="piece-svg extra-pion-svg cosmic-extra-pion">
      <!-- Orbiting Gyro Ring -->
      <ellipse cx="22.5" cy="22.5" rx="19" ry="8" fill="none" stroke="${cyan}" stroke-width="1.6" stroke-dasharray="4 2" class="cosmic-gyro-spin"/>
      <!-- Mech Vanguard Chassis -->
      <polygon points="14,40 31,40 28,26 17,26" fill="${metal}" stroke="${border}" stroke-width="2"/>
      <polygon points="17,26 22.5,12 28,26" fill="${cyan}" stroke="${border}" stroke-width="1.8" opacity="0.85"/>
      <!-- Hyper Core Visor -->
      <rect x="18" y="16" width="9" height="5" rx="2" fill="#00f2fe" stroke="#ffffff" stroke-width="1"/>
      <!-- Vanguard Satellite Wings -->
      <line x1="9" y1="24" x2="16" y2="28" stroke="${cyan}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="36" y1="24" x2="29" y2="28" stroke="${cyan}" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Pulsing Quantum Vertex -->
      <circle cx="22.5" cy="9" r="3" fill="#ffffff" stroke="${cyan}" stroke-width="1.5"/>
    </svg>`;
  } else if (patternId === 'sacred_lotus') {
    // Sacred Lotus Mandala Pion: Golden Stem + Dewy 8-Petal Blossom + Glowing Sun Core
    const petal = isWhite ? '#f472b6' : '#c084fc';
    const gold = '#fbbf24';
    const stem = '#10b981';
    return `<svg viewBox="0 0 45 45" class="piece-svg extra-pion-svg lotus-extra-pion">
      <!-- Outer Petal Ripple Ring -->
      <circle cx="22.5" cy="20" r="17" fill="none" stroke="${gold}" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.7"/>
      <!-- Golden Emerald Stem -->
      <path d="M22.5 40 L22.5 24" stroke="${stem}" stroke-width="3" stroke-linecap="round"/>
      <path d="M22.5 34 Q13 32 12 26 Q19 25 22.5 30" fill="${stem}"/>
      <path d="M22.5 32 Q32 30 33 24 Q26 23 22.5 28" fill="${stem}"/>
      <!-- 8 Sacred Mandala Petals -->
      <g transform="translate(22.5, 18)">
        ${[0, 45, 90, 135, 180, 225, 270, 315].map(deg =>
          `<path d="M0 -11 C3 -8 3 -3 0 0 C-3 -3 -3 -8 0 -11 Z" fill="${petal}" stroke="${gold}" stroke-width="1.2" transform="rotate(${deg})"/>`
        ).join('')}
        <circle cx="0" cy="0" r="4.5" fill="${gold}" stroke="#ffffff" stroke-width="1.4"/>
        <circle cx="0" cy="0" r="2.2" fill="#ffffff"/>
      </g>
    </svg>`;
  } else if (patternId === 'titan_crown') {
    // Titan Sovereign Crown Pion: Diamond Imperial Sigil + Violet Lightning Wings + Sovereign Star
    const body = isWhite ? '#f3e8ff' : '#2e1065';
    const purple = '#a855f7';
    const gold = '#facc15';
    return `<svg viewBox="0 0 45 45" class="piece-svg extra-pion-svg titan-extra-pion">
      <!-- Imperial Starburst Halo -->
      <polygon points="22.5,2 26,16 38,16 29,23 33,36 22.5,28 12,36 16,23 7,16 19,16" fill="rgba(168, 85, 247, 0.25)" stroke="${purple}" stroke-width="1.2"/>
      <!-- Sovereign Body Chassis -->
      <path d="M13 40 L32 40 L28 25 L17 25 Z" fill="${body}" stroke="${purple}" stroke-width="2"/>
      <!-- Imperial Diamond Chest -->
      <polygon points="22.5,20 28,26 22.5,32 17,26" fill="${gold}" stroke="${purple}" stroke-width="1.5"/>
      <!-- Royal Crown Apex -->
      <polygon points="16,16 18,9 22.5,13 27,9 29,16" fill="${gold}" stroke="${purple}" stroke-width="1.6"/>
      <circle cx="18" cy="8" r="1.5" fill="#ffffff"/>
      <circle cx="22.5" cy="12" r="1.8" fill="#ffffff"/>
      <circle cx="27" cy="8" r="1.5" fill="#ffffff"/>
      <circle cx="22.5" cy="26" r="2" fill="#ffffff"/>
    </svg>`;
  } else if (patternId === 'zeus_thunder') {
    // Aegis of Olympus Pion: Golden Greek Aspis Shield + Lightning Keraunos + Sunburst Halo
    const body = isWhite ? '#faf8f0' : '#1e1b4b';
    const gold = '#facc15';
    const bronze = isWhite ? '#b45309' : '#78350f';
    const electric = '#00f2fe';
    return `<svg viewBox="0 0 45 45" class="piece-svg extra-pion-svg greek-extra-pion">
      <!-- Radiating Sunburst Corona -->
      <circle cx="22.5" cy="22.5" r="19" fill="none" stroke="${gold}" stroke-width="1.6" stroke-dasharray="3 3" opacity="0.85" class="lock-ring-spin"/>
      <!-- Greek Aspis Shield Body Base -->
      <path d="M12 40 L33 40 L28 26 L17 26 Z" fill="${body}" stroke="${bronze}" stroke-width="2"/>
      <!-- Golden Aegis Round Shield Disk -->
      <circle cx="22.5" cy="22" r="12" fill="${body}" stroke="${gold}" stroke-width="2.2"/>
      <circle cx="22.5" cy="22" r="9.5" fill="none" stroke="${bronze}" stroke-width="1" stroke-dasharray="2 2"/>
      <!-- Crackling Zeus Thunderbolt Keraunos Core -->
      <g transform="translate(22.5, 22)">
        <polygon points="0,-13 4,-2 0,-3 5,11 -2,2 2,1 -4,-11" fill="${electric}" stroke="${gold}" stroke-width="1.2"/>
        <circle cx="1" cy="0" r="3" fill="#ffffff" stroke="${gold}" stroke-width="1"/>
        <circle cx="1" cy="0" r="1.4" fill="${electric}"/>
      </g>
      <!-- Twin Olympian Laurel Horns on Apex -->
      <path d="M16 11 Q12 5 14 2 Q18 5 17 9" fill="${gold}" stroke="${bronze}" stroke-width="1"/>
      <path d="M29 11 Q33 5 31 2 Q27 5 28 9" fill="${gold}" stroke="${bronze}" stroke-width="1"/>
    </svg>`;
  } else {
    // Ember Vanguard (Default): Runic Flame Chevrons + Golden Solar Core + Radiant Flare
    const body = isWhite ? '#fff7ed' : '#431407';
    const orange = '#f97316';
    const gold = '#fbbf24';
    return `<svg viewBox="0 0 45 45" class="piece-svg extra-pion-svg ember-extra-pion">
      <!-- Radiating Ember Spark Ring -->
      <circle cx="22.5" cy="22" r="18" fill="none" stroke="${orange}" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.8" class="lock-ring-spin"/>
      <!-- Runic Base Pedestal -->
      <path d="M13 40 L32 40 L28 26 L17 26 Z" fill="${body}" stroke="${orange}" stroke-width="2"/>
      <path d="M17 26 L22.5 12 L28 26 Z" fill="${gold}" stroke="${orange}" stroke-width="1.8"/>
      <!-- Flaming Vanguard Chevron -->
      <path d="M19 23 L22.5 17 L26 23" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Solar Crest Core -->
      <circle cx="22.5" cy="11" r="4" fill="${orange}" stroke="${gold}" stroke-width="1.5"/>
      <circle cx="22.5" cy="11" r="2" fill="#ffffff"/>
      <!-- Crown Ember Horns -->
      <line x1="18" y1="9" x2="15" y2="4" stroke="${orange}" stroke-width="2" stroke-linecap="round"/>
      <line x1="27" y1="9" x2="30" y2="4" stroke="${orange}" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  }
}

export function getPieceName(type: PieceType, theme: ThemeType): string {
  const names = K[theme].nm.split(' ');
  switch (type) {
    case 'p': return names[0] || 'Pawn';
    case 'n': return names[1] || 'Knight';
    case 'b': return names[2] || 'Bishop';
    case 'r': return names[3] || 'Rook';
    case 'q': return names[4] || 'Queen';
    case 'k': return names[5] || 'King';
  }
}
