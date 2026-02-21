export const sendSuccess = (res, statusCode, message, data = null) => {
    return res.status(statusCode).json({
        success: true,
        code: statusCode,
        message,
        data,
        error: null
    });
}

export const sendError = (res, statusCode, message, error = null, data = null) => {
    return res.status(statusCode).json({
        success: false,
        code: statusCode,
        message,
        data,
        error
    });
}
