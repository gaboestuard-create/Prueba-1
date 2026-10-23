import React from "react";
import { Composition } from "remotion";
import { DURACION, Video } from "./Video";
import { FPS } from "./piezas";

export const Root: React.FC = () => (
  <Composition id="Biometria" component={Video} durationInFrames={DURACION} fps={FPS} width={1080} height={1920} />
);
