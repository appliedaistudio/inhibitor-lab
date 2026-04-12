import type { RunVerifiersFn } from "../contracts";
import { runActionVerifier } from "./action";
import { runAntiSycophancyVerifier } from "./anti-sycophancy";
import { runEmotionalCalibrationVerifier } from "./emotional-calibration";
import { runGroundingVerifier } from "./grounding";
import { runLearningVerifier } from "./learning";
import { runPrivacyPolicyVerifier } from "./privacy-policy";

export const runAllVerifiers: RunVerifiersFn = async (input) =>
  Promise.all([
    runGroundingVerifier(input),
    runAntiSycophancyVerifier(input),
    runLearningVerifier(input),
    runActionVerifier(input),
    runEmotionalCalibrationVerifier(input),
    runPrivacyPolicyVerifier(input)
  ]);
