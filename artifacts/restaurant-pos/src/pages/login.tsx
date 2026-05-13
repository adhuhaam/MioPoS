import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../lib/auth";
import { useLogin, useListOutlets, getListOutletsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";

export default function Login() {
  const [outletId, setOutletId] = useState<string>("");
  const [pin, setPin] = useState("");
  const [superAdmin, setSuperAdmin] = useState(false);
  const { setAuth } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: outlets, isLoading: loadingOutlets } = useListOutlets({
    query: { queryKey: getListOutletsQueryKey() }
  });

  const loginMutation = useLogin();

  const handleNumpad = (num: string) => {
    if (pin.length < 4) setPin(prev => prev + num);
  };

  const handleDelete = () => setPin(prev => prev.slice(0, -1));

  const handleLogin = () => {
    if (!superAdmin && !outletId) {
      toast({ variant: "destructive", title: "Select an outlet first" });
      return;
    }
    if (pin.length !== 4) {
      toast({ variant: "destructive", title: "PIN must be 4 digits" });
      return;
    }

    const body = superAdmin
      ? { pin }
      : { outletId: parseInt(outletId), pin };

    loginMutation.mutate({ data: body as any }, {
      onSuccess: (data) => {
        setAuth(data);
        setLocation(data.staff.role === "kitchen" ? "/kitchen" : "/");
      },
      onError: () => {
        toast({ variant: "destructive", title: "Invalid PIN" });
        setPin("");
      }
    });
  };

  const toggleSuperAdmin = () => {
    setSuperAdmin(v => !v);
    setOutletId("");
    setPin("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">ChainPOS</h1>
          <p className="text-muted-foreground">Sign in to your outlet</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Staff Login</CardTitle>
                <CardDescription className="mt-1">
                  {superAdmin ? "Enter your super admin PIN" : "Select your outlet and enter your PIN"}
                </CardDescription>
              </div>
              {superAdmin && (
                <Badge variant="secondary" className="gap-1.5 py-1 px-2.5">
                  <Shield className="w-3 h-3" />
                  Super Admin
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Outlet selector — hidden in super admin mode */}
            {!superAdmin && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Outlet</label>
                <Select value={outletId} onValueChange={setOutletId} disabled={loadingOutlets}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select outlet..." />
                  </SelectTrigger>
                  <SelectContent>
                    {outlets?.map(outlet => (
                      <SelectItem key={outlet.id} value={outlet.id.toString()}>
                        {outlet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* PIN dots */}
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="flex gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-full border-2 transition-colors ${
                        i < pin.length
                          ? "bg-primary border-primary"
                          : "border-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <Button
                    key={num}
                    variant="outline"
                    className="h-14 text-xl font-medium"
                    onClick={() => handleNumpad(num.toString())}
                  >
                    {num}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  className="h-14 text-xl font-medium text-destructive"
                  onClick={handleDelete}
                >
                  C
                </Button>
                <Button
                  variant="outline"
                  className="h-14 text-xl font-medium"
                  onClick={() => handleNumpad("0")}
                >
                  0
                </Button>
                <Button
                  variant="default"
                  className="h-14 text-xl font-medium"
                  onClick={handleLogin}
                  disabled={loginMutation.isPending}
                >
                  OK
                </Button>
              </div>
            </div>

            {/* Super admin toggle */}
            <div className="text-center pt-2">
              <button
                onClick={toggleSuperAdmin}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
              >
                {superAdmin ? "← Back to outlet login" : "Super Admin login"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
