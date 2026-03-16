import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Eye, EyeOff, CheckCircle2, XCircle, Loader2, ChevronDown, Save,
  ExternalLink, RefreshCw, Key, Globe, Briefcase,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ApiSettings, ConnectionStatus } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();

  // Local form state – API keys
  const [lexwareKey, setLexwareKey] = useState("");
  const [clockifyKey, setClockifyKey] = useState("");
  const [clockifyRegion, setClockifyRegion] = useState("global");
  const [clockifyWorkspace, setClockifyWorkspace] = useState("");
  const [clockifyUser, setClockifyUser] = useState("");
  const [showLexKey, setShowLexKey] = useState(false);
  const [showClkKey, setShowClkKey] = useState(false);

  // Local form state – Business settings
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [taxClass, setTaxClass] = useState("I");
  const [targetWeeklyHours, setTargetWeeklyHours] = useState(40);
  const [churchTax, setChurchTax] = useState(false);

  // Fetch current masked settings
  const { data: settings } = useQuery<ApiSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: status, refetch: refetchStatus, isFetching: testingConnection } = useQuery<ConnectionStatus>({
    queryKey: ["/api/connection-status"],
    enabled: false,
  });

  useEffect(() => {
    if (settings) {
      setClockifyRegion(settings.clockifyRegion || "global");
      setClockifyWorkspace(settings.clockifyWorkspaceId || "");
      setClockifyUser(settings.clockifyUserId || "");
      setMonthlyExpenses(settings.monthlyExpenses || 0);
      setTaxClass(settings.taxClass || "I");
      setTargetWeeklyHours(settings.targetWeeklyHours || 40);
      setChurchTax(settings.churchTax || false);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<ApiSettings>) => {
      const res = await apiRequest("POST", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Einstellungen gespeichert", description: "Deine Konfiguration wurde aktualisiert." });
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const buildUpdate = (): Partial<ApiSettings> => {
    const update: Partial<ApiSettings> = {
      clockifyRegion: clockifyRegion as any,
      clockifyWorkspaceId: clockifyWorkspace,
      clockifyUserId: clockifyUser,
      monthlyExpenses,
      taxClass: taxClass as any,
      targetWeeklyHours,
      churchTax,
    };
    if (lexwareKey && !lexwareKey.includes("****")) {
      update.lexwareApiKey = lexwareKey;
    }
    if (clockifyKey && !clockifyKey.includes("****")) {
      update.clockifyApiKey = clockifyKey;
    }
    return update;
  };

  const handleSave = () => {
    saveMutation.mutate(buildUpdate());
  };

  const handleTestConnection = () => {
    saveMutation.mutate(buildUpdate(), {
      onSuccess: () => {
        refetchStatus();
      },
    });
  };

  const regions = [
    { value: "global", label: "Global" },
    { value: "euc1", label: "Deutschland / EU (euc1)" },
    { value: "euw2", label: "UK (euw2)" },
    { value: "use2", label: "USA (use2)" },
    { value: "apse2", label: "Australien (apse2)" },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6" data-testid="settings-page">
      <div>
        <h1 className="text-lg font-bold text-foreground tracking-tight">Einstellungen</h1>
        <p className="text-xs text-muted-foreground mt-0.5">API-Schlüssel, Verbindungen und Geschäftsparameter konfigurieren</p>
      </div>

      {/* Business Settings Section */}
      <div className="rounded-lg border border-card-border bg-card p-5 space-y-4" data-testid="settings-business">
        <div className="flex items-center gap-2">
          <Briefcase size={16} className="text-chart-2" />
          <h2 className="text-sm font-semibold text-card-foreground">Business-Einstellungen</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="monthly-expenses" className="text-xs text-muted-foreground">Monatliche Fixkosten (€)</Label>
            <Input
              id="monthly-expenses"
              type="number"
              min={0}
              step={100}
              value={monthlyExpenses}
              onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
              placeholder="z.B. 1500"
              className="text-sm h-9"
              data-testid="input-monthly-expenses"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Steuerklasse</Label>
            <Select value={taxClass} onValueChange={setTaxClass}>
              <SelectTrigger className="h-9 text-sm" data-testid="select-tax-class">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="I">Klasse I</SelectItem>
                <SelectItem value="II">Klasse II</SelectItem>
                <SelectItem value="III">Klasse III</SelectItem>
                <SelectItem value="IV">Klasse IV</SelectItem>
                <SelectItem value="V">Klasse V</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-weekly-hours" className="text-xs text-muted-foreground">Ziel-Wochenstunden</Label>
            <Input
              id="target-weekly-hours"
              type="number"
              min={1}
              max={80}
              step={1}
              value={targetWeeklyHours}
              onChange={(e) => setTargetWeeklyHours(Number(e.target.value))}
              placeholder="z.B. 40"
              className="text-sm h-9"
              data-testid="input-target-weekly-hours"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Kirchensteuer</Label>
            <div className="flex items-center gap-3 h-9">
              <Switch
                checked={churchTax}
                onCheckedChange={setChurchTax}
                data-testid="switch-church-tax"
              />
              <span className="text-sm text-muted-foreground">{churchTax ? "Ja (8–9 %)" : "Nein"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lexware Section */}
      <div className="rounded-lg border border-card-border bg-card p-5 space-y-4" data-testid="settings-lexware">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-card-foreground">Lexware Office</h2>
          </div>
          {status?.lexware && (
            <Badge
              variant={status.lexware.connected ? "default" : "destructive"}
              className="text-[10px] font-medium"
            >
              {status.lexware.connected ? (
                <><CheckCircle2 size={10} className="mr-1" /> Verbunden</>
              ) : (
                <><XCircle size={10} className="mr-1" /> Nicht verbunden</>
              )}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lexware-key" className="text-xs text-muted-foreground">API-Schlüssel</Label>
          <div className="relative">
            <Input
              id="lexware-key"
              type={showLexKey ? "text" : "password"}
              value={lexwareKey}
              onChange={(e) => setLexwareKey(e.target.value)}
              placeholder={settings?.lexwareApiKey || "API-Schlüssel eingeben..."}
              className="pr-10 text-sm h-9"
              data-testid="input-lexware-key"
            />
            <button
              type="button"
              onClick={() => setShowLexKey(!showLexKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              data-testid="button-toggle-lexware-key"
            >
              {showLexKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-primary hover:underline">
            <ChevronDown size={12} /> Wie bekomme ich den API-Schlüssel?
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground space-y-1.5">
            <p>1. Gehe zu <a href="https://app.lexware.de/addons/public-api" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 inline-flex items-center gap-0.5">Lexware Public API <ExternalLink size={10} /></a></p>
            <p>2. Klicke auf „Neuen API-Schlüssel erstellen"</p>
            <p>3. Kopiere den generierten Schlüssel und füge ihn hier ein</p>
          </CollapsibleContent>
        </Collapsible>

        {status?.lexware?.error && (
          <p className="text-xs text-destructive">{status.lexware.error}</p>
        )}
        {status?.lexware?.connected && status.lexware.profile && (
          <p className="text-xs text-emerald-500">Verbunden als: {status.lexware.profile}</p>
        )}
      </div>

      {/* Clockify Section */}
      <div className="rounded-lg border border-card-border bg-card p-5 space-y-4" data-testid="settings-clockify">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-chart-4" />
            <h2 className="text-sm font-semibold text-card-foreground">Clockify</h2>
          </div>
          {status?.clockify && (
            <Badge
              variant={status.clockify.connected ? "default" : "destructive"}
              className="text-[10px] font-medium"
            >
              {status.clockify.connected ? (
                <><CheckCircle2 size={10} className="mr-1" /> Verbunden</>
              ) : (
                <><XCircle size={10} className="mr-1" /> Nicht verbunden</>
              )}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="clockify-key" className="text-xs text-muted-foreground">API-Schlüssel</Label>
          <div className="relative">
            <Input
              id="clockify-key"
              type={showClkKey ? "text" : "password"}
              value={clockifyKey}
              onChange={(e) => setClockifyKey(e.target.value)}
              placeholder={settings?.clockifyApiKey || "API-Schlüssel eingeben..."}
              className="pr-10 text-sm h-9"
              data-testid="input-clockify-key"
            />
            <button
              type="button"
              onClick={() => setShowClkKey(!showClkKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              data-testid="button-toggle-clockify-key"
            >
              {showClkKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Globe size={12} /> Region
            </Label>
            <Select value={clockifyRegion} onValueChange={setClockifyRegion}>
              <SelectTrigger className="h-9 text-sm" data-testid="select-clockify-region">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {regions.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clockify-workspace" className="text-xs text-muted-foreground">Workspace ID</Label>
            <Input
              id="clockify-workspace"
              value={clockifyWorkspace}
              onChange={(e) => setClockifyWorkspace(e.target.value)}
              placeholder="Wird automatisch erkannt..."
              className="text-sm h-9"
              data-testid="input-clockify-workspace"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="clockify-user" className="text-xs text-muted-foreground">User ID</Label>
          <Input
            id="clockify-user"
            value={clockifyUser}
            onChange={(e) => setClockifyUser(e.target.value)}
            placeholder="Wird automatisch erkannt..."
            className="text-sm h-9"
            data-testid="input-clockify-user"
          />
        </div>

        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-primary hover:underline">
            <ChevronDown size={12} /> Wie bekomme ich den API-Schlüssel?
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground space-y-1.5">
            <p>1. Gehe zu den Clockify Profileinstellungen</p>
            <p>2. Scrolle zum Abschnitt „API"</p>
            <p>3. Kopiere deinen API-Schlüssel</p>
            <p className="text-[10px]">Workspace ID und User ID werden automatisch erkannt, wenn du die Verbindung testest.</p>
          </CollapsibleContent>
        </Collapsible>

        {status?.clockify?.error && (
          <p className="text-xs text-destructive">{status.clockify.error}</p>
        )}
        {status?.clockify?.connected && status.clockify.user && (
          <p className="text-xs text-emerald-500">Verbunden als: {status.clockify.user}</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="h-9 text-sm"
          data-testid="button-save-settings"
        >
          {saveMutation.isPending ? (
            <Loader2 size={14} className="mr-1.5 animate-spin" />
          ) : (
            <Save size={14} className="mr-1.5" />
          )}
          Speichern
        </Button>

        <Button
          variant="outline"
          onClick={handleTestConnection}
          disabled={testingConnection || saveMutation.isPending}
          className="h-9 text-sm"
          data-testid="button-test-connection"
        >
          {testingConnection ? (
            <Loader2 size={14} className="mr-1.5 animate-spin" />
          ) : (
            <RefreshCw size={14} className="mr-1.5" />
          )}
          Verbindung testen
        </Button>
      </div>
    </div>
  );
}
