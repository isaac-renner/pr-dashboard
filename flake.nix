{
  description = "PR Dashboard with observability stack";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [ "aarch64-darwin" "x86_64-darwin" "x86_64-linux" "aarch64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
      pkgsFor = system: nixpkgs.legacyPackages.${system};
    in
    {
      packages = forAllSystems (system:
        let pkgs = pkgsFor system; in
        {
          default = pkgs.stdenv.mkDerivation {
            pname = "pr-dashboard";
            version = "0.2.0";
            src = ./.;
            nativeBuildInputs = [ pkgs.makeWrapper pkgs.bun ];

            buildPhase = ''
              export HOME=$TMPDIR
              bun install --frozen-lockfile 2>/dev/null || bun install
              cd packages/web && bunx vite build && cd ../..
            '';

            installPhase = let
              entrypoint = pkgs.writeShellScript "pr-dashboard-entrypoint" ''
                if [ -n "''${GH_TOKEN_FILE:-}" ] && [ -f "$GH_TOKEN_FILE" ]; then
                  export GH_TOKEN=$(cat "$GH_TOKEN_FILE")
                fi
                if [ -n "''${GITHUB_TOKEN_FILE:-}" ] && [ -f "$GITHUB_TOKEN_FILE" ]; then
                  export GITHUB_TOKEN=$(cat "$GITHUB_TOKEN_FILE")
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
                --set-default OPENCODE_URL "http://mentat:9741" \
                --set-default NODE_ENV "production" \
                --set-default STATIC_DIR "$out/share/pr-dashboard/packages/web/dist"
            '';
          };
        }
      );

      devShells = forAllSystems (system:
        let pkgs = pkgsFor system; in
        {
          default = pkgs.mkShell {
            packages = [ pkgs.bun pkgs.gh ];
          };

          # Full observability stack: nix develop .#otel
          # Requires: grafana, tempo, loki, prometheus, otelcol-contrib in PATH
          # Install via: nix profile install nixpkgs#{grafana,tempo,grafana-loki,prometheus,opentelemetry-collector-contrib}
          otel = pkgs.mkShell {
            packages = [
              pkgs.bun
              pkgs.gh
              pkgs.grafana
              pkgs.tempo
              pkgs.grafana-loki
              pkgs.prometheus
              pkgs.opentelemetry-collector-contrib
            ];

            GRAFANA_HOME = "${pkgs.grafana}/share/grafana";

            shellHook = ''
              echo ""
              echo "  PR Dashboard + Observability Stack"
              echo "  Run: bun run dev:otel"
              echo ""
              mkdir -p .otel/{tempo-data,tempo-wal,loki-data,prometheus-data,grafana-data}
            '';
          };
        }
      );
    };
}
