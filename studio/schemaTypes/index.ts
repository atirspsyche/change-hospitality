import { consultant } from './consultant';
import { environmentalImpact } from './environmentalImpact';
import { job } from './job';
import { location } from './location';
import { salary } from './salary';
import { editorialTypes } from './editorial';
import { candidateGallery } from './candidateGallery';

export const schemaTypes = [salary, location, consultant, job, environmentalImpact, candidateGallery, ...editorialTypes];