import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles } from 'lucide-react';
import type { TakeoffProjectProfile } from '@/hooks/useProjectProfile';

interface ProjectProfilePanelProps {
  profile: Partial<TakeoffProjectProfile> | null;
  loading?: boolean;
  onChange: (patch: Partial<TakeoffProjectProfile>) => void;
}

const num = (v: any) => (v == null || v === '' ? '' : String(v));
const toNum = (v: string) => (v === '' ? null : Number(v));
const toInt = (v: string) => (v === '' ? null : parseInt(v, 10));

export function ProjectProfilePanel({ profile, loading, onChange }: ProjectProfilePanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Project Profile
          {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && !profile ? (
          <p className="text-xs text-muted-foreground">Extracting project facts from drawings…</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Total SF" value={num(profile?.total_sf)} onChange={(v) => onChange({ total_sf: toNum(v) })} />
              <Field label="Heated SF" value={num(profile?.heated_sf)} onChange={(v) => onChange({ heated_sf: toNum(v) })} />
              <Field label="Unheated SF" value={num(profile?.unheated_sf)} onChange={(v) => onChange({ unheated_sf: toNum(v) })} />
            </div>
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
              <Field label="Roof" value={profile?.roof_type ?? ''} onChange={(v) => onChange({ roof_type: v || null })} />
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
