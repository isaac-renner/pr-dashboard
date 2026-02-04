{
  description = "PR Dashboard - filtered GitHub PR viewer with Jira links and CI status";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

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
            version = "0.1.0";
            src = ./.;
            nativeBuildInputs = [ pkgs.makeWrapper ];
            installPhase = ''
              mkdir -p $out/share/pr-dashboard
              cp server.ts index.html $out/share/pr-dashboard/

              mkdir -p $out/bin
              makeWrapper ${pkgs.bun}/bin/bun $out/bin/pr-dashboard \
                --add-flags "run $out/share/pr-dashboard/server.ts" \
                --prefix PATH : ${pkgs.lib.makeBinPath [ pkgs.gh ]}
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
        }
      );
    };
}
