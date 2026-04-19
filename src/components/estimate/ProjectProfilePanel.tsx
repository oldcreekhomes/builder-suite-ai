import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Plus, Trash2 } from 'lucide-react';
import type { TakeoffProjectProfile } from '@/hooks/useProjectProfile';

interface ProjectProfilePanelProps {
  profile: Partial<TakeoffProjectProfile> | null;
  loading?: boolean;
  onChange: (patch: Partial<TakeoffProjectProfile>) => void;
}

type AreaRow = { label: string; sf: number | null };

const num = (v: any) => (v == null || v === '' ? '' : String(v));
const toNum = (v: string) => (v === '' ? null : Number(v));
const toInt = (v: string) => (v === '' ? null : parseInt(v, 10));

function readAreaSchedule(profile: Partial<TakeoffProjectProfile> | null): AreaRow[] {
  const raw = (profile as any)?.area_schedule;
  if (!Array.isArray(raw)) return [];
  return raw.map((r: any) => ({
    label: String(r?.label ?? ''),
    sf: r?.sf == null || r?.sf === '' ? null : Number(r.sf),
  }));
}

function readRoofPitches(profile: Partial<TakeoffProjectProfile> | null): string[] {
  const raw = (profile as any)?.roof_pitches;
  return Array.isArray(raw) ? raw.map((s) => String(s)) : [];
}

export function ProjectProfilePanel({ profile, loading, onChange }: ProjectProfilePanelProps) {
  const areaSchedule = readAreaSchedule(profile);
  const roofPitches = readRoofPitches(profile);

  const setSchedule = (next: AreaRow[]) => onChange({ area_schedule: next as any });
  const setPitches = (next: string[]) => onChange({ roof_pitches: next as any });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Project Profile
          {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !profile ? (
          <p className="text-xs text-muted-foreground">Extracting project facts from drawings…</p>
        ) : (
          <>
            {/* Area Schedule */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase text-muted-foreground">Area Schedule</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2"
                  onClick={() => setSchedule([...areaSchedule, { label: '', sf: null }])}
                >
                  <Plus className="h-3 w-3 mr-1" /> Row
                </Button>
              </div>
              {areaSchedule.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No area schedule detected. Add rows manually.</p>
              ) : (
                <div className="space-y-1">
                  {areaSchedule.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_90px_28px] gap-1 items-center">
                      <Input
                        value={row.label}
                        placeholder="Label (e.g., Main Level)"
                        className="h-7 text-xs"
                        onChange={(e) => {
                          const next = [...areaSchedule];
                          next[idx] = { ...next[idx], label: e.target.value };
                          setSchedule(next);
                        }}
                      />
                      <Input
                        value={num(row.sf)}
                        placeholder="SF"
                        className="h-7 text-xs"
                        onChange={(e) => {
                          const next = [...areaSchedule];
                          next[idx] = { ...next[idx], sf: toNum(e.target.value) };
                          setSchedule(next);
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setSchedule(areaSchedule.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Counts */}
            <div className="grid grid-cols-4 gap-2">
              <Field label="Beds" value={num(profile?.bedrooms)} onChange={(v) => onChange({ bedrooms: toInt(v) })} />
              <Field label="Full BA" value={num(profile?.full_baths)} onChange={(v) => onChange({ full_baths: toInt(v) })} />
              <Field label="Half BA" value={num(profile?.half_baths)} onChange={(v) => onChange({ half_baths: toInt(v) })} />
              <Field label="Stories" value={num(profile?.stories)} onChange={(v) => onChange({ stories: toInt(v) })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Garage bays" value={num(profile?.garage_bays)} onChange={(v) => onChange({ garage_bays: toInt(v) })} />
              <Field label="Garage type" value={profile?.garage_type ?? ''} onChange={(v) => onChange({ garage_type: v || null })} />
              <Field label="Foundation" value={profile?.foundation_type ?? ''} onChange={(v) => onChange({ foundation_type: v || null })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Basement" value={profile?.basement_type ?? ''} onChange={(v) => onChange({ basement_type: v || null })} />
              <Field label="Basement SF" value={num(profile?.basement_sf)} onChange={(v) => onChange({ basement_sf: toNum(v) })} />
              <Field label="Roof type" value={profile?.roof_type ?? ''} onChange={(v) => onChange({ roof_type: v || null })} />
            </div>

            {/* Roof Pitches */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase text-muted-foreground">Roof Pitches</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2"
                  onClick={() => setPitches([...roofPitches, ''])}
                >
                  <Plus className="h-3 w-3 mr-1" /> Pitch
                </Button>
              </div>
              {roofPitches.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">None detected.</p>
              ) : (
                <div className="space-y-1">
                  {roofPitches.map((p, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_28px] gap-1 items-center">
                      <Input
                        value={p}
                        placeholder="e.g., 8/12 main"
                        className="h-7 text-xs"
                        onChange={(e) => {
                          const next = [...roofPitches];
                          next[idx] = e.target.value;
                          setPitches(next);
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setPitches(roofPitches.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-7 text-xs" />
    </div>
  );
}
