export class AppError extends Error { constructor(public readonly statusCode:number,message:string,public readonly details?:unknown){ super(message); this.name='AppError'; } }
export class NotFoundError extends AppError { constructor(message='Recurso no encontrado'){super(404,message);} }
export class ValidationError extends AppError { constructor(message='Solicitud invalida',details?:unknown){super(422,message,details);} }
