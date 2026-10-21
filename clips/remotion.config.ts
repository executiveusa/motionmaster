import { Config } from "@remotion/cli/config";

// PNG intermediates: JPEG artifacts band badly in the dark gradient areas of these clips.
Config.setVideoImageFormat("png");
Config.setPixelFormat("yuv420p");
Config.setCodec("h264");
Config.setCrf(16);
Config.setOverwriteOutput(true);
