import { ProbeOrientation } from './types';

export type ProbeModelDef = {
    value: string;
    label: string;
    path: string | null; // null = built-in Voyager model
    orientation: ProbeOrientation;
};

// Available 3D models in public/models/
export const PROBE_MODELS: ProbeModelDef[] = [
    { value: 'voyager', label: 'Voyager (Built-in)', path: null, orientation: { autoAlign: true, invertDirection: true } },
    { value: 'space_fighter', label: 'Space Fighter', path: '/models/space_fighter.glb', orientation: { autoAlign: true, invertDirection: true } },
    { value: 'space_shuttle', label: 'Space Shuttle', path: '/models/space_shuttle.glb', orientation: { autoAlign: true, invertDirection: true } },
    { value: 'space_shuttle_2', label: 'Space Shuttle 2', path: '/models/space_shuttle_2.glb', orientation: { autoAlign: true, invertDirection: true } },
    { value: 'space_ship', label: 'Space Ship', path: '/models/space_ship.glb', orientation: { autoAlign: true, invertDirection: true } },
    { value: 'space_ship_2', label: 'Space Ship 2', path: '/models/space_ship_2.glb', orientation: { autoAlign: true, invertDirection: true } },
    { value: 'space_fighter_3', label: 'Space Fighter 3', path: '/models/space_fighter_3.glb', orientation: { autoAlign: true, invertDirection: true } },
    { value: 'lego_scooter', label: 'LEGO Space Scooter', path: '/models/lego_885_-_space_scooter.glb', orientation: { autoAlign: true, invertDirection: true } },
    { value: 'sputnik', label: 'Retro Sputnik', path: '/models/space_retro_sputnik.glb', orientation: { autoAlign: true, invertDirection: true } },
    { value: 'station_2001', label: 'Space Station (2001)', path: '/models/space_station_v_2001_a_space_odyssey.glb', orientation: { autoAlign: true, invertDirection: true } },
];

export function findProbeModel(value: string): ProbeModelDef | undefined {
    return PROBE_MODELS.find((m) => m.value === value);
}
