import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Compass, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center p-8 border shadow-lg">
        <CardContent className="pt-6 flex flex-col items-center">
          <div className="p-4 bg-muted rounded-full mb-4">
            <Compass className="h-10 w-10 text-primary animate-pulse" />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-foreground mb-2">404</h1>
          <h2 className="text-xl font-semibold text-foreground mb-2">Page Not Found</h2>
          <p className="text-sm text-muted-foreground mb-6">
            The page you are looking for at <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{location.pathname}</code> does not exist or has moved.
          </p>
          <Button asChild className="gap-2">
            <Link to="/">
              <Home className="h-4 w-4" />
              Return to Vault Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
