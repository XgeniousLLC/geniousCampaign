import { PartialType } from '@nestjs/mapped-types';
import { CreateSequenceDto } from './create-sequence.dto';

export class UpdateSequenceDto extends PartialType(CreateSequenceDto) {}
