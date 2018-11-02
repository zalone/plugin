不知道你们有没有这样的需求：
1、压缩图片每次都要上tinypng.com手动上传，再下载覆盖，而且一次只能上传20张...如果项目更新了新图，又得再上传压一遍，重复这个枯燥的过程。之前的确写了个用来上传到tinypng的脚本，不过还是没绕开一次20张图的问题，就算申请了key，每个月也只能压500张。所以改用pngquant，也有现成的插件pngquant(参考附录1)，只需改动一下就能用。
2、由于官方没有提供图片资源加密的功能，有需求都是自己写脚本然后改引擎文件来实现，加密解密过程繁琐，还要改引擎文件，不熟悉C++就惨了。
3、官方虽然提供了热更新范例，也给了version_generator.js来生成manifest文件，但是每次构建完都要自己去运行该命令行，还得覆盖几个地方，过程繁琐，没有一键生成配置的功能。

有没有那种一键XXX之类的，可以帮我自动完成的插件。。。对，没错 build-setting插件就是你想要的。选择对应的功能后可以在构建完成后自动运行。


该插件综合了图片压缩、图片加密、生成热更文件的功能，对已有的功能做一些搬运。

1、图片压缩用的是pngquant，较tinypng的压缩率会高一点，所以项目中图片已经用tinypng压过的图经此工具再压后可能会出现比原图大的情况。
2、图片加密用的是简单的异或加密算法，输入加密前缀和加密秘钥后需要点击右上角的"修改CCImage"按钮来达到修改引擎文件的目的，秘钥目前只支持一个长度(字母数字等字符)。
3、生成热更文件功能，在输入版本号和url并把项目路径assets下的project.manifest拖到框后，构建时会自动在构建目录下生成project.manifest和version.manifest。需要拖动project.manifest是要获得该文件的uuid，cocos creator v2.0后构建生成的文件以uuid来命名，获得路径后方便覆盖构建出来的project.manifest文件；也可以选择不拖动，自己去手动覆盖。

参考附录：
图片压缩 https://forum.cocos.com/t/png/56942
图片加密 https://forum.cocos.com/t/cocos-creator/58620/5
热更文件 https://forum.cocos.com/t/native/61662
插件小王子 https://github.com/tidys/CocosCreatorPlugins
定制项目构建流程 https://docs.cocos.com/creator/manual/zh/publish/custom-project-build-template.html

by yong