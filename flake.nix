{
  description = "PR Dashboard with observability stack";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

    # Mutually exclusive service inputs — each pinned independently.
    # Update one without affecting others: nix flake lock --update-input nixpkgs-grafana
    nixpkgs-grafana.url    = "github:NixOS/nixpkgs/nixpkgs-unstable";
    nixpkgs-tempo.url      = "github:NixOS/nixpkgs/nixpkgs-unstable";
    nixpkgs-loki.url       = "github:NixOS/nixpkgs/nixpkgs-unstable";
    nixpkgs-prometheus.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    nixpkgs-otelcol.url    = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs = { self, nixpkgs, nixpkgs-grafana, nixpkgs-tempo,
               nixpkgs-loki, nixpkgs-prometheus, nixpkgs-otelcol }:
    let
      systems = [ "aarch64-darwin" "x86_64-darwin" "x86_64-linux" "aarch64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      pkgsFor       = system: nixpkgs.legacyPackages.${system};
      grafanaFor    = system: nixpkgs-grafana.legacyPackages.${system};
      tempoFor      = system: nixpkgs-tempo.legacyPackages.${system};
      lokiFor       = system: nixpkgs-loki.legacyPackages.${system};
      prometheusFor = system: nixpkgs-prometheus.legacyPackages.${system};
      otelcolFor    = system: nixpkgs-otelcol.legacyPackages.${system};
    in
    {
      packages = forAllSystems (system:
        let pkgs = pkgsFor system; in
        {
          default = pkgs.stdenv.mkDerivation {
            pname = "pr-dashboard";
            version = "0.1.0";
            src = ./.;
            nativeBuildInputs = [ pkgs.makeWrapper ];
            installPhase = let
              entrypoint = pkgs.writeShellScript "pr-dashboard-entrypoint" ''
                if [ -n "''${GH_TOKEN_FILE:-}" ] && [ -f "$GH_TOKEN_FILE" ]; then
                  export GH_TOKEN=$(cat "$GH_TOKEN_FILE")
                fi
                exec "$@"
              '';
            in ''
              mkdir -p $out/share/pr-dashboard
              cp -r packages $out/share/pr-dashboard/
              cp -r node_modules $out/share/pr-dashboard/ 2>/dev/null || true
              cp package.json tsconfig.base.json $out/share/pr-dashboard/

              mkdir -p $out/bin
              makeWrapper ${entrypoint} $out/bin/pr-dashboard \
                --add-flags "${pkgs.bun}/bin/bun run $out/share/pr-dashboard/packages/server/src/main.ts" \
                --prefix PATH : ${pkgs.lib.makeBinPath [ pkgs.gh ]} \
                --set-default OPENCODE_URL "http://mentat:9741"
            '';
          };
        }
      );

      devShells = forAllSystems (system:
        let
          pkgs       = pkgsFor system;
          grafana    = grafanaFor system;
          tempo      = tempoFor system;
          loki       = lokiFor system;
          prometheus = prometheusFor system;
          otelcol    = otelcolFor system;
        in
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.bun
              pkgs.gh
            ];
          };

          # Full observability stack: nix develop .#otel
          otel = pkgs.mkShell {
            packages = [
              pkgs.bun
              pkgs.gh
              grafana.grafana
              tempo.tempo
              loki.grafana-loki
              prometheus.prometheus
              otelcol.opentelemetry-collector-contrib
            ];

            GRAFANA_HOME = "${grafana.grafana}/share/grafana";

            shellHook = ''
              echo ""
              echo "  PR Dashboard + Observability Stack"
              echo "  ─────────────────────────────────────"
              echo "  App server:     http://localhost:3333"
              echo "  Vite:           http://localhost:5173"
              echo "  Grafana:        http://localhost:3000  (admin/admin)"
              echo "  OTel Collector: http://localhost:4318"
              echo "  Tempo:          http://localhost:3200"
              echo "  Loki:           http://localhost:3100"
              echo "  Prometheus:     http://localhost:9090"
              echo ""
              echo "  Run: bun run dev:otel"
              echo ""

              mkdir -p .otel/{tempo-data,tempo-wal,loki-data,prometheus-data,grafana-data}
            '';
          };
        }
      );
    };
}
