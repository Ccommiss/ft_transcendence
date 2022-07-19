import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from "@nestjs/websockets"
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { jwtConstants } from '../auth/jwt/jwt.constants';
import { JwtService, JwtVerifyOptions } from '@nestjs/jwt';
import { User } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { GameService } from '../game/game.service';
import { WsJwtAuthGuard } from 'src/auth/guards/ws-auth.guard';
import { ChannelService } from 'src/channel/channel.service';
import { MessageService } from 'src/message/message.service';
import { sendPrivateMessageDto } from 'src/dtos/sendPrivateMessageDto.dto';
import { Channel } from 'src/channel/channel.entity';

@Injectable()
@WebSocketGateway()
export class WSServer implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

	@WebSocketServer()
	protected server: Server;

	constructor(
		protected readonly jwtService: JwtService,
		protected readonly userService: UserService,
		protected readonly channelService: ChannelService,
		protected readonly messageService: MessageService
	) { }

	protected logger: Logger = new Logger('WebSocketServer');
	protected active_users = new Map<User, Socket>();
	protected users = [];

	protected async validateConnection(client: Socket): Promise<User> {
		try {
			const authCookies: string[] = client.handshake.headers.cookie.split('; ');
			const authCookie: string[] = authCookies.filter(s => s.includes('Authentication='));
			const authToken = authCookie[0].substring(15, authCookie[0].length);
			const jwtOptions: JwtVerifyOptions = {
				secret: jwtConstants.secret
			}
			const jwtPayload = await this.jwtService.verify(authToken, jwtOptions);
			const user: any = await this.userService.getUserByIdentifier(jwtPayload.sub);

			return user;
		} catch (err) {
			console.log(err.message);
		}
	}

	/**
	 * Handle first connection from WebSocket. Can't use Guard on this
	 * So we validate directly on the function
	 * @param client Socket initialized by client
	 * @returns Nothing, but handle disconnection if problems occurs
	 */
	async handleConnection(client: Socket) {
		const user = await this.validateConnection(client);
		if (!user)
			return this.handleDisconnect(client);

		client.data.user = user;
		this.logger.log("New connection: " + user.name);
		if (!this.active_users.has(user))
			this.active_users.set(user, client);
		this.logger.log(client.id);

		this.active_users.forEach((socket: Socket, user: User) => {
			this.server.to(socket.id).emit(
				'listUsers',
				this.listConnectedUser(socket, this.active_users, false)
			);
		});

		let chan : Channel[] = await this.userService.getChannelsForUser(user);
		this.logger.log(" CHANS" + chan);

		for (let c of chan) {
			client.join(c.name);
			this.logger.log(user.name + " : Client joining" + c.name)
		}

	}

	afterInit(server: Server) {
		this.logger.log("Start listenning");
	}

	/**
	 * Handle Socket disconnection.
	 * @param client Socket received from client
	 */
	async handleDisconnect(client: Socket) {
		try {
			this.logger.log("User: " + client.data.user.name + " disconnected");
			this.active_users.delete(client.data.user);
		}
		catch (err) {
			console.log("Don't know what append");
		}
		this.server.emit(
			'listUsers',
			this.listConnectedUser(client, this.active_users, false)
		);
		client.emit('bye');
		client.disconnect(true);
	}

	/**
	 * Return a JSON object with all active user. With or without the user who made the request
	 * regardind of `withCurrentUser` parameters
	 * @param client user who made the request
	 * @param active_user map of active user
	 * @param withCurrentUser if true user who made the request will be included
	 * @returns
	 */
	protected listConnectedUser(client: Socket, active_user: Map<User, Socket>, withCurrentUser: boolean = true) {
		let data = [];
		let i = 0;

		for (let user of active_user.keys()) {
			user.status = "online";
			if (client.data.user.id == user.id && withCurrentUser) {
				data[i] = user;
				i++;
			}
			else if (client.data.user.id != user.id) {
				data[i] = user;
				i++;
			}
		}
		return (data);
	}


	//	_____ _    _       _______    _____       _______ ________          __ __     __
	//	/ ____| |  | |   /\|__   __|  / ____|   /\|__   __|  ____\ \        / /\\ \   / /
	// | |    | |__| |  /  \  | |    | |  __   /  \  | |  | |__   \ \  /\  / /  \\ \_/ /
	// | |    |  __  | / /\ \ | |    | | |_ | / /\ \ | |  |  __|   \ \/  \/ / /\ \\   /
	// | |____| |  | |/ ____ \| |    | |__| |/ ____ \| |  | |____   \  /\  / ____ \| |
	//	\_____|_|  |_/_/    \_\_|     \_____/_/    \_\_|  |______|   \/  \/_/    \_\_|

	/**
		 *
		 * @param client
		 * @param channel
		 * @returns
		 */
	@UseGuards(WsJwtAuthGuard)
	@SubscribeMessage('createRoom') /** Join ROom parce que ca le creera aussi */
	async onCreateRoom(client: Socket, channel: string) // qd on pourrq faire passer pqr le service avant, on pourra mettre Channel
	{
		await this.userService.joinChannel(client.data.user, channel);
		client.join(channel);
		return this.server.emit('rooms', client.data.user.name + " created the room ", await this.channelService.getUsersOfChannels()); // a recuperer dans le service du front

	}



	/**
	 *
	 * @param client
	 * @param channel
	 * @returns
	 */
	@UseGuards(WsJwtAuthGuard)
	@SubscribeMessage('getRooms') /** Join ROom parce que ca le creera aussi */
	async onGetRooms(client: Socket, channel: string)
	{
		return this.server.to(client.id).emit('rooms', client.data.user.username + " receive rooms ", await this.channelService.getUsersOfChannels()); // a recuperer dans le service du front
	}

	/**
	 *
	 * @param client
	 * @param channel
	 * @returns
	 */
	@UseGuards(WsJwtAuthGuard)
	@SubscribeMessage('joinRoom') /** Join ROom parce que ca le creera aussi */
	async onJoinRoom(client: Socket, channel: string) // qd on pourrq faire passer pqr le service avant, on pourra mettre Channel
	{
		await this.userService.joinChannel(client.data.user, channel);
		client.join(channel);
		return this.server.emit('rooms', client.data.user.username + " joined the room ", await this.channelService.getUsersOfChannels()); // a recuperer dans le service du front
	}


	/**
	 *
	 * @param client
	 * @param channel
	 * @returns
	 */
	@UseGuards(WsJwtAuthGuard)
	@SubscribeMessage('deleteRoom')
	async onDeletedRoom(client: Socket, channel: string) {
		await this.channelService.deleteChannel(client.data.user, await this.channelService.getChannelByIdentifier(channel));
		return this.server.emit('rooms', channel + "has been deleted", await this.channelService.getUsersOfChannels()); // on emet a tt le monde que le chan a ete supp
	}

	/**
	 *
	 * @param client
	 * @param channel
	 * @returns
	 */
	@UseGuards(WsJwtAuthGuard)
	@SubscribeMessage('leaveRoom') /** Join ROom parce que ca le creera aussi */
	async onLeaveRoom(client: Socket, channel: string) // qd on pourrq faire passer pqr le service avant, on pourra mettre Channel
	{
		this.logger.log(client.data.user.name + " LEFT ROOM")
		await this.userService.leaveChannel(client.data.user, channel);
		this.server.emit('rooms', client.data.user.username + " left the room ", await this.channelService.getUsersOfChannels()); // a recuperer dans le service du front
		client.leave(channel);
	}

	/**
	 * Each time someone want to emit/receive a private message, this function is called
	 *
	 * @brief emit the PM to both the sender and emitter
	 * @param client
	 * @param msg
	 * @returns
	 */
	@UseGuards(WsJwtAuthGuard)
	@SubscribeMessage('privateMessage')
	async onPrivateMessage(client: Socket, msg: sendPrivateMessageDto) {
		// sending message to both users : sender (client.id) and msg.socketId
		this.server.to(msg.socketId).to(client.id).emit('privateMessage', client.data.user.name + " sent a message to " + msg.username + msg.socketId, msg);
		return await this.messageService.sendPrivateMessage(client.data.user, msg.username, msg.msg);
	}

	/**
	 *
	 * @param client
	 * @param user2
	 * @returns
	 */
	@UseGuards(WsJwtAuthGuard)
	@SubscribeMessage('getPrivateMessage')
	async onGetPrivateMessage(client: Socket, user2: string) {
		const msg = await this.messageService.getPrivateMessage(client.data.user, user2);

		this.server.to(client.id).emit('privateMessage', client.data.user.name + " get messages with " + user2, msg);
		return
	}

	/**
	 *
	 * @param client
	 * @param channelName
	 * @returns
	 */
	@UseGuards(WsJwtAuthGuard)
	@SubscribeMessage('getChannelMessages')
	async onGetChannelMessages(client: Socket, channelName: string)// : { target : string, message : string}) // qd on pourrq faire passer pqr le service avant, on pourra mettre Channel
	{
		this.server.to(client.id).emit('channelMessage', await this.messageService.getMessage(channelName));
	}

	@UseGuards(WsJwtAuthGuard)
	@SubscribeMessage('sendChannelMessages')
	async onSendChannelMessages(client: Socket, data: any)// : { target : string, message : string}) // qd on pourrq faire passer pqr le service avant, on pourra mettre Channel
	{
		this.logger.log("MSG " + data.msg + " to " + data.chan + " from " + client.data.user.name)
		this.server.to(data.chan).emit('channelMessage', await this.messageService.getMessage(data.chan));
		return await this.messageService.sendMessageToChannel(data.chan, client.data.user, data.msg);
	}

	@UseGuards(WsJwtAuthGuard)
	@SubscribeMessage('message')
	handleMessage(client: any, payload: any): string {
		return 'Hello world!';
	}


	@UseGuards(WsJwtAuthGuard)
	@SubscribeMessage('test')
	test(client: any, payload: any) {
		this.logger.log("TEST OK");
	}



	//@UseGuards(WsJwtAuthGuard)
	//@SubscribeMessage('getUsers')
	//getActiveUsers (client: Socket) {
	//	this.server.to(client.id).emit(
	//		'listUsers',
	//		this.listConnectedUser(client, this.active_users, false)
	//	);
	//}
}
