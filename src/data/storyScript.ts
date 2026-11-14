import { StoryBeat, WorldBody } from '../types/game';

export function buildStoryBeats(world: WorldBody, siteName: string): StoryBeat[] {
  const worldLabel = world === 'MOON' ? 'Moon Base Alpha' : siteName;
  const gravityNote =
    world === 'MOON'
      ? '0.16g floaty Moon gravity and minus 130 degree shadows'
      : '0.38g dusty Mars gravity and toxic perchlorate soil';

  return [
    {
      id: 'office-selection',
      scene: 'NASA_OFFICE',
      locationLabel: 'NASA Mission Control Office · Houston',
      speakerName: 'Director Vance',
      speakerRole: 'NASA Flight Director',
      voiceProfile: 'DIRECTOR',
      line: `Step inside, Engineer Alex! Massive solar storm waves are spinning up on the Sun, and our computers just picked YOU as Lead Base Engineer for the urgent 7-Sol ${worldLabel} mission!`,
      sceneHint: 'Mission Control holographic globe locked onto your 7-Sol target!'
    },
    {
      id: 'office-accept',
      scene: 'NASA_OFFICE',
      locationLabel: 'NASA Mission Control Office · Briefing Desk',
      speakerName: 'Engineer Alex (You)',
      speakerRole: 'Selected 7-Sol Outpost Engineer',
      voiceProfile: 'ENGINEER',
      line: `Whoa, me?! I am ready, Director! I know water makes our oxygen by electrolysis, and space acts like a giant thermos if cooling radiators break. My backpack is packed with 3D filament and batteries!`,
      sceneHint: 'Grabbing Space Backpack: Mega Battery, Sun Blanket, Water Tank & 3D Filament.'
    },
    {
      id: 'office-sendoff',
      scene: 'NASA_OFFICE',
      locationLabel: 'NASA Launch Readiness Room',
      speakerName: 'Director Vance',
      speakerRole: 'NASA Flight Director',
      voiceProfile: 'DIRECTOR',
      line: `That is why we chose you! Take good care of our crops, keep CO2 scrubbers clean, and power the magnetic Forcefield before storms hit. Earth Radio will stay on your channel all 7 Sols!`,
      sceneHint: 'Rocket hatch sealed — countdown to launch complete!'
    },
    {
      id: 'transit-descent',
      scene: 'TRANSIT',
      locationLabel: `Landing Craft · Descending to ${worldLabel}`,
      speakerName: 'Flight Radio (CAPCOM)',
      speakerRole: 'Mission Radio Channel',
      voiceProfile: 'RADIO',
      line: `Copy that, Engineer! Braking rockets firing cleanly! Watch out on landing for ${gravityNote}. Touchdown on the outpost pad in five seconds!`,
      sceneHint: 'Retro-thrusters firing over the horizon!'
    },
    {
      id: 'outpost-arrival',
      scene: 'OUTPOST_ARRIVAL',
      locationLabel: `${worldLabel} · Touchdown Complete!`,
      speakerName: 'Earth Buddy Radio',
      speakerRole: 'Outpost Comms Channel',
      voiceProfile: 'RADIO',
      line: `Welcome to ${worldLabel}, Engineer! Look around your 3D base—all five stations are online. Walk between pads, watch for surprise physics alerts, and lead us through all 7 Sols!`,
      sceneHint: 'Landing pad ramp lowered — you are now live on the outpost!'
    }
  ];
}
