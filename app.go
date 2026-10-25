package main

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	csvDialogTitle    = "选择 CSV 文件"
	csvFilterDisplay  = "CSV 文件 (*.csv)"
	csvFilterPattern  = "*.csv"
	csvFilePermission = 0o644
)

// App 只提供前端无法完成的系统能力：文件对话框与纯文本读写。
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// OpenFileDialog 打开文件对话框并返回选中的 CSV 绝对路径，取消时返回空字符串。
func (a *App) OpenFileDialog() (string, error) {
	return wailsruntime.OpenFileDialog(a.ctx, wailsruntime.OpenDialogOptions{
		Title: csvDialogTitle,
		Filters: []wailsruntime.FileFilter{
			{DisplayName: csvFilterDisplay, Pattern: csvFilterPattern},
		},
	})
}

// SaveFileDialog 打开保存对话框，默认文件名由前端提供，取消时返回空字符串。
func (a *App) SaveFileDialog(defaultName string) (string, error) {
	return wailsruntime.SaveFileDialog(a.ctx, wailsruntime.SaveDialogOptions{
		Title:           csvDialogTitle,
		DefaultFilename: defaultName,
		Filters: []wailsruntime.FileFilter{
			{DisplayName: csvFilterDisplay, Pattern: csvFilterPattern},
		},
	})
}

// ReadTextFile 以纯文本方式读取文件内容，不做任何解析或编码处理。
func (a *App) ReadTextFile(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// WriteTextFile 用给定文本覆盖写入文件。
func (a *App) WriteTextFile(path string, content string) error {
	return os.WriteFile(path, []byte(content), csvFilePermission)
}

// RevealInFileManager 在系统文件管理器中定位并选中给定文件。
func (a *App) RevealInFileManager(path string) error {
	if strings.TrimSpace(path) == "" {
		return os.ErrInvalid
	}

	absPath, err := filepath.Abs(path)
	if err != nil {
		return err
	}

	switch runtime.GOOS {
	case "windows":
		return launchDetached("explorer.exe", "/select,", absPath)
	case "darwin":
		return launchDetached("open", "-R", absPath)
	default:
		return launchDetached("xdg-open", filepath.Dir(absPath))
	}
}

// launchDetached 启动外部程序后立即放行，不等待其退出。
func launchDetached(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	if err := cmd.Start(); err != nil {
		return err
	}
	_ = cmd.Process.Release()
	return nil
}
