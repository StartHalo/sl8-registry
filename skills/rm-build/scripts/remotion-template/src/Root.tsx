import React from "react";
import { Composition, CalculateMetadataFunction } from "remotion";
import { StudioVideo } from "./StudioVideo";
import { studioSchema, defaultStudioProps, type StudioProps } from "./schema";

const FPS = 30;

// Duration is data-driven, not hardcoded per composition.
const calculateMetadata: CalculateMetadataFunction<StudioProps> = ({ props }) => ({
  durationInFrames: Math.round(props.durationSeconds * FPS),
});

// One <Composition> per aspect ratio (a different orientation is a separate composition,
// never a render flag). rm-render selects the id per requested AR.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Studio-16x9"
        component={StudioVideo}
        fps={FPS}
        width={1920}
        height={1080}
        schema={studioSchema}
        defaultProps={defaultStudioProps}
        calculateMetadata={calculateMetadata}
      />
      <Composition
        id="Studio-9x16"
        component={StudioVideo}
        fps={FPS}
        width={1080}
        height={1920}
        schema={studioSchema}
        defaultProps={defaultStudioProps}
        calculateMetadata={calculateMetadata}
      />
      <Composition
        id="Studio-1x1"
        component={StudioVideo}
        fps={FPS}
        width={1080}
        height={1080}
        schema={studioSchema}
        defaultProps={defaultStudioProps}
        calculateMetadata={calculateMetadata}
      />
    </>
  );
};
