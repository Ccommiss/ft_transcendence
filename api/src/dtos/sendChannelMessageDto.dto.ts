import { Length } from "class-validator";
import { IsNotEmpty } from "class-validator";

export class sendChannelMessageDto
{
	@IsNotEmpty()
	@Length(3, 50)
	chan: string;

	@IsNotEmpty()
	@Length(1, 250)
	msg: string;
}
