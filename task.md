## Design Context

### Users
**Primary audience**: Technical recruiters and hiring managers evaluating this as a portfolio project. The interface must immediately communicate technical sophistication, real-world applicability, and engineering quality. Secondary users include academic evaluators (faculty) reviewing the B.Tech capstone project. The system itself targets Indian drivers and routes (India-centric map, city examples like Mumbai → Pune).

**Context of use**: Users will view this in a browser — often quickly scanning during a hiring review or academic presentation. First impressions matter enormously. The interface must look polished, professional, and functional at a glance.

**Job to be done**: Demonstrate that the team built a real-world, production-grade AI system — not just a notebook experiment. The app should feel like a working product that solves a meaningful problem (fuel optimization via ML + IoV).

### Brand Personality
**Voice**: Eco-friendly, sustainable, purpose-driven
**Tone**: Informative, impactful, modern — communicates "this tech helps the planet"
**3-word personality**: **Eco-conscious · Intelligent · Impactful**
**Emotional goal**: Urgency & impact — "I'm saving fuel and helping the planet right now." Every interaction should reinforce the idea that the user is making an environmentally conscious choice.

### Aesthetic Direction
**Visual tone**: Dark-mode, data-rich dashboard aesthetic with eco-green accents. Premium but not cold — organic warmth through green gradients and nature-aligned color language.

**Theme**: Dark mode (exclusively) — `#0f172a` base with slate layers (`#1e293b`, `#334155`). Brand green palette (`#22c55e` → `#14532d`) as primary accent. Blue (`#3b82f6`) and amber (`#f59e0b`) as route-differentiation secondaries.

**Typography**: Inter (Google Fonts) — weights 300–700. Clean, modern, highly legible.

**Design language**:
- Glassmorphism panels (`backdrop-filter: blur`, semi-transparent backgrounds, subtle borders)
- Smooth micro-animations: fade-in, slide-up, staggered card entrances, animated counters
- Glow effects: hero card pulse, button shimmer sweep, badge shimmer
- Custom scrollbars matching the dark palette
- Reduced-motion support via `prefers-reduced-motion` media query

**Primary reference**: Google Maps — familiar, functional, map-centric layout. The map is the hero element; controls are secondary sidebars.

**Anti-references**: Overly minimalist interfaces with no visual personality. The app should feel alive, data-rich, and visually engaging — not stripped-down or boring.

**Responsiveness**: Must work well on mobile devices and tablets. Current layout uses responsive Tailwind grid (`grid-cols-1 lg:grid-cols-4`).

### Design Principles
1. **Eco-Impact First**: Every design choice should reinforce the environmental mission. Use green as the primary action color. Show CO₂ savings prominently. Make the "eco-score" feel rewarding.
2. **Data as Delight**: Present ML predictions, route metrics, and comparisons in visually rich, animated ways — not plain text. Animated counters, progress bars, and gradient-highlighted cards turn data into engagement.
3. **Map-Centric Layout**: The map is the centerpiece. All controls, results, and comparisons should orbit around the map view. Never let UI chrome overshadow the geographic visualization.
4. **Portfolio-Grade Polish**: Every pixel matters. Attention to hover states, focus rings, loading states, transition timing, and staggered animations. The app should feel like it was built by someone who cares deeply about craft.
5. **Accessible & Responsive**: Support reduced motion preferences, clear focus indicators, semantic HTML, and fluid layouts from mobile to desktop. No user should be excluded.
