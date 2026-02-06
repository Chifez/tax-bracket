
export class AppError extends Error {
    constructor(
        public message: string,
        public statusCode: number = 400,
        public code?: string
    ) {
        super(message)
        this.name = 'AppError'
    }
}

export const badRequest = (message: string, code?: string) => new AppError(message, 400, code)
export const unauthorized = (message: string = 'Unauthorized', code?: string) => new AppError(message, 401, code)
export const forbidden = (message: string = 'Forbidden', code?: string) => new AppError(message, 403, code)
export const notFound = (message: string = 'Not Found', code?: string) => new AppError(message, 404, code)
export const internalServerError = (message: string = 'Internal Server Error', code?: string) => new AppError(message, 500, code)
