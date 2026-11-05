import { consultant } from './consultant';
import { environmentalImpact } from './environmentalImpact';
import { job } from './job';
import { location } from './location';
import { salary } from './salary';
import { editorialTypes } from './editorial';
import { candidateGallery } from './candidateGallery';
import { storyInstagram } from './storyInstagram';

export const schemaTypes = [salary, location, consultant, job, environmentalImpact, candidateGallery, storyInstagram, ...editorialTypes];