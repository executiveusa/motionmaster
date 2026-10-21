import React from "react";
import { AbsoluteFill, Composition } from "remotion";
import { LaunchTitle } from "./LaunchTitle";
import { KineticType } from "./KineticType";
import { ProductLoop } from "./ProductLoop";
import { FootageTitle } from "./FootageTitle";
import { SourceClip } from "./SourceClip";

/**
 * The compositions are authored in a 1920x1080 design space and rendered at 1280x720.
 * A single CSS scale keeps the authoring coordinates intact while producing exact
 * integer output dimensions — Remotion rejects non-integer render sizes.
 */
const SCALE = 1280 / 1920;

const scaled = (Component: React.FC) => {
  const Wrapped: React.FC = () => (
    <AbsoluteFill style={{ backgroundColor: "#0E0E10", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1920,
          height: 1080,
          transform: `scale(${SCALE})`,
          transformOrigin: "top left",
        }}
      >
        <Component />
      </div>
    </AbsoluteFill>
  );
  return Wrapped;
};

const LaunchTitleScaled = scaled(LaunchTitle);
const KineticTypeScaled = scaled(KineticType);
const ProductLoopScaled = scaled(ProductLoop);
const FootageTitleScaled = scaled(FootageTitle);
const SourceClipScaled = scaled(SourceClip);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LaunchTitle"
        component={LaunchTitleScaled}
        durationInFrames={420}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{}}
      />
      <Composition
        id="KineticType"
        component={KineticTypeScaled}
        durationInFrames={270}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{}}
      />
      <Composition
        id="ProductLoop"
        component={ProductLoopScaled}
        durationInFrames={630}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{}}
      />
      <Composition
        id="FootageTitle"
        component={FootageTitleScaled}
        durationInFrames={480}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{}}
      />
      <Composition
        id="SourceClip"
        component={SourceClipScaled}
        durationInFrames={480}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{}}
      />
    </>
  );
};
